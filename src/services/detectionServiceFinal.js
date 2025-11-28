// ============================================================================
// DETECTION SERVICE FINAL - v5.2.0
// Flujo correcto: Validación → Google Sheets → Generación → Guardado → Return
// ============================================================================

const normalize = require('../utils/normalize');
const { scraperBridge } = require('../scrapers/scraperBridge');
const { detectDuty } = require('../utils/dutyDetector');
const { detectFamilyHD, detectFamilyLD } = require('../utils/familyDetector');
const { generateSKU } = require('../sku/generator');
const { getMedia } = require('../utils/mediaMapper');
const { noEquivalentFound } = require('../utils/messages');
const { searchInSheet, appendToSheet } = require('./syncSheetsService');
const { extractFramSpecs, extractDonaldsonSpecs, getDefaultSpecs } = require('../services/Technicalspecsscraper · JS');

// Helper local: extraer años de un texto
function extractYears(text = '') {
    const t = String(text || '').replace(/\s+/g, ' ').trim();
    if (!t) return '';
    const range = t.match(/\b(19|20)\d{2}\s*[-–—]\s*(19|20)\d{2}\b/);
    if (range) return `${range[1]}${range[0].slice(range[1].length, range[0].length - range[2].length)}${range[2]}`;
    const present = t.match(/\b(19|20)\d{2}\s*(?:-|to|a|hasta)\s*(?:present|presente|actual)\b/i);
    if (present) return `${present[1]}+`;
    const single = t.match(/\b(19|20)\d{2}\b/);
    if (single) return single[0];
    return '';
}

// ---------------------------------------------------------------------------
// Limpieza y estandarización global (LD): OEM y Cross-References
// ---------------------------------------------------------------------------
// Prioridad de marcas aftermarket para orden global (mercado mundial)
const AFTERMARKET_PRIORITY = [
    'MOTORCRAFT', 'PUROLATOR', 'WIX', 'NAPA', 'ACDELCO', 'BOSCH', 'K&N', 'STP',
    'CHAMP', 'MICROGARD', 'CARQUEST', 'MOBIL', 'MOBIL 1', 'DENSO', 'SUPERTECH',
    'PREMIUM', 'PREMIUM GUARD', 'HASTINGS', 'BALDWIN',
    // Global brands (EU/ASIA) to consider when presentes
    'MANN-FILTER', 'MAHLE', 'HENGST', 'RYCO', 'CHAMPION', 'UFI', 'SCT', 'FILTRON',
    'VIC', 'TOKYO ROKI'
];

function cleanOEMList(list, duty) {
    const arr = Array.isArray(list) ? list : [];
    const seen = new Set();
    const cleaned = [];
    for (const item of arr) {
        const val = String(item || '').trim().replace(/\s+/g, ' ');
        if (!val) continue;
        const code = codeOnly(val);
        if (!code) continue;
        const key = code.toUpperCase();
        if (!seen.has(key)) {
            seen.add(key);
            cleaned.push(code);
        }
    }
    // Unificar límite: siempre máximo 20 elementos
    return cleaned.slice(0, 20);
}

function cleanCrossList(list, duty, inputCode, source) {
    const arr = Array.isArray(list) ? list : [];
    if (arr.length === 0) return arr;

    // Normalize and deduplicate by original string
    const seen = new Set();
    const normalized = [];
    for (const item of arr) {
        const val = String(item || '').trim().replace(/\s+/g, ' ');
        if (!val) continue;
        const key = val.toUpperCase();
        if (!seen.has(key)) {
            seen.add(key);
            normalized.push(val);
        }
    }

    // Eliminar self-codes de FRAM (p.ej., "FRAM PH6607")
    const inputUpper = String(inputCode || '').toUpperCase();
    const filtered = normalized.filter(s => {
        const up = s.toUpperCase();
        const isFramSelf = up.startsWith('FRAM ') && up.includes(inputUpper);
        return !isFramSelf;
    });

    // Map to code-only y deduplicar por código
    const codeSeen = new Set();
    const codeOnlyList = [];
    for (const s of filtered) {
        const c = codeOnly(s);
        if (!c) continue;
        const k = c.toUpperCase();
        if (!codeSeen.has(k)) {
            codeSeen.add(k);
            codeOnlyList.push(c);
        }
    }

    // Orden alfanumérico por código
    codeOnlyList.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    // Unificar límite: siempre máximo 20 elementos
    return codeOnlyList.slice(0, 20);
}

function cleanAppsList(list, duty) {
    const arr = Array.isArray(list) ? list : [];
    const seen = new Set();
    const cleaned = [];
    for (const item of arr) {
        let name = '';
        let years = '';
        if (item && typeof item === 'object' && 'name' in item) {
            name = String(item.name || '').trim().replace(/\s+/g, ' ');
            years = String(item.years || '').trim();
        } else {
            const val = String(item || '').trim().replace(/\s+/g, ' ');
            if (!val) continue;
            name = val;
            years = extractYears(val);
        }
        if (!name) continue;
        const key = `${name.toUpperCase()}|${years}`;
        if (!seen.has(key)) {
            seen.add(key);
            cleaned.push({ name, years });
        }
    }
    const limited = duty === 'LD' ? cleaned.slice(0, 20) : cleaned;
    return limited;
}

// Extract only the part number code from a string, stripping leading brand words
function codeOnly(text) {
    const s = String(text || '').trim();
    if (!s) return '';
    // Prefer capturing the trailing code-like segment (allows internal hyphens)
    // e.g., "BALDWIN-B495" -> "B495", "FLEETGUARD-LF-910S" -> "FL-910S"
    const m = s.match(/(?:^|[\s\-–—])([A-Z0-9][A-Z0-9\-\.]*\d[A-Z0-9\-\.]*)$/i);
    if (m && m[1]) {
        return m[1].trim();
    }
    // Fallback: remove leading brand-only prefix tokens (no digits) and keep the rest
    const tokens = s.split(/[\s\-–—]+/).filter(Boolean);
    let startIdx = 0;
    for (let i = 0; i < tokens.length; i++) {
        if (/\d/.test(tokens[i])) { startIdx = i > 0 ? i - 1 : i; break; }
    }
    const remainder = tokens.slice(startIdx).join('-').trim();
    if (remainder) return remainder;
    // Final fallback: return original string
    return s;
}

// Preferred display: "Brand Model" when brand is detectable in name
const OEM_MANUFACTURERS = [
    'TOYOTA','LEXUS','HONDA','ACURA','NISSAN','INFINITI','FORD','LINCOLN','GM','CHEVROLET','CADILLAC','BUICK','GMC',
    'MOPAR','CHRYSLER','DODGE','JEEP','KIA','HYUNDAI','BMW','AUDI','VOLKSWAGEN','VW','MERCEDES','MERCEDES-BENZ',
    'MAZDA','SUBARU','SUZUKI','PEUGEOT','RENAULT','FIAT','CITROEN','VOLVO','SAAB','PORSCHE','SEAT','SKODA','MINI',
    'MITSUBISHI','ISUZU','YAMAHA','CUMMINS','CATERPILLAR','CAT','DETROIT','MTU','JOHN DEERE','KOMATSU'
];

function preferBrandModelFormat(apps) {
    const arr = Array.isArray(apps) ? apps : [];
    return arr.map(item => {
        if (!item || typeof item !== 'object') return item;
        const name = String(item.name || '').trim();
        if (!name) return item;

        const tokens = name.split(/\s+/);
        const upper = name.toUpperCase();

        function hasBrand(br) { return upper.includes(br); }
        const brand = OEM_MANUFACTURERS.find(b => hasBrand(b));
        if (!brand) return item; // Nothing to do if no detectable brand

        // Patterns: "Model (Brand)" -> "Brand Model"
        const paren = name.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
        if (paren) {
            const model = paren[1].trim();
            const brandRaw = paren[2].trim();
            const brandUp = brandRaw.toUpperCase();
            const matchBrand = OEM_MANUFACTURERS.find(b => brandUp.includes(b));
            if (matchBrand) {
                const newName = `${matchBrand.charAt(0) + matchBrand.slice(1).toLowerCase()} ${model}`.trim();
                return { ...item, name: newName };
            }
        }

        // Patterns: "Brand - Model" or "Model - Brand"
        const dash = name.split(/\s*[-–—]\s*/);
        if (dash.length === 2) {
            const a = dash[0].trim();
            const b = dash[1].trim();
            const aUp = a.toUpperCase();
            const bUp = b.toUpperCase();
            const aBrand = OEM_MANUFACTURERS.find(x => aUp.includes(x));
            const bBrand = OEM_MANUFACTURERS.find(x => bUp.includes(x));
            if (aBrand && !bBrand) {
                return { ...item, name: `${aBrand.charAt(0) + aBrand.slice(1).toLowerCase()} ${b}` };
            }
            if (bBrand && !aBrand) {
                return { ...item, name: `${bBrand.charAt(0) + bBrand.slice(1).toLowerCase()} ${a}` };
            }
        }

        // Pattern: trailing brand (e.g., "Camry Toyota") -> "Toyota Camry"
        const lastToken = tokens[tokens.length - 1];
        const lastUp = String(lastToken || '').toUpperCase();
        const trailingBrand = OEM_MANUFACTURERS.find(x => lastUp.includes(x));
        if (trailingBrand && tokens.length > 1 && !name.toUpperCase().startsWith(trailingBrand)) {
            const model = tokens.slice(0, -1).join(' ').trim();
            return { ...item, name: `${trailingBrand.charAt(0) + trailingBrand.slice(1).toLowerCase()} ${model}` };
        }

        // Already starts with brand or no clear model separation; keep as is
        return item;
    });
}

// Defaults to guarantee minimum application count
const LD_ENGINE_DEFAULTS = [
    { name: 'Gasoline Engines', years: '' },
    { name: 'Diesel Engines', years: '' },
    { name: 'Hybrid Engines', years: '' },
    { name: 'V6 Engines', years: '' },
    { name: 'V8 Engines', years: '' },
    { name: 'Inline-4 Engines', years: '' },
    { name: 'Inline-6 Engines', years: '' },
    { name: 'Turbocharged Engines', years: '' },
    { name: 'High-Performance Engines', years: '' },
    { name: 'Small Displacement Engines', years: '' },
    { name: 'Naturally Aspirated Engines', years: '' }
];

const LD_EQUIPMENT_DEFAULTS = [
    { name: 'Passenger Vehicles', years: '' },
    { name: 'Light Trucks', years: '' },
    { name: 'SUVs', years: '' },
    { name: 'Crossovers', years: '' },
    { name: 'Minivans', years: '' },
    { name: 'Compact Cars', years: '' },
    { name: 'Midsize Cars', years: '' },
    { name: 'Full-Size Cars', years: '' },
    { name: 'Pickup Trucks', years: '' },
    { name: 'Performance Cars', years: '' },
    { name: 'Luxury Vehicles', years: '' }
];

const HD_ENGINE_DEFAULTS = [
    { name: 'Heavy Duty Diesel Engines', years: '' },
    { name: 'Inline-6 Diesel Engines', years: '' },
    { name: 'V8 Diesel Engines', years: '' },
    { name: 'Turbo Diesel Engines', years: '' },
    { name: 'Off‑Highway Diesel Engines', years: '' },
    { name: 'Marine Diesel Engines', years: '' },
    { name: 'Generator Diesel Engines', years: '' },
    { name: 'Bus and Coach Diesel Engines', years: '' },
    { name: 'Industrial Diesel Engines', years: '' },
    { name: 'Agricultural Diesel Engines', years: '' },
    { name: 'Railway Diesel Engines', years: '' }
];

const HD_EQUIPMENT_DEFAULTS = [
    { name: 'Commercial Trucks', years: '' },
    { name: 'Construction Equipment', years: '' },
    { name: 'Agricultural Equipment', years: '' },
    { name: 'Mining Machinery', years: '' },
    { name: 'Buses and Coaches', years: '' },
    { name: 'Heavy Machinery', years: '' },
    { name: 'Generators', years: '' },
    { name: 'Marine Equipment', years: '' },
    { name: 'Industrial Equipment', years: '' },
    { name: 'Forestry Equipment', years: '' },
    { name: 'Rail Equipment', years: '' }
];

function ensureMinApps(list, duty, kind) {
    const targetMin = 10;
    const out = Array.isArray(list) ? [...list] : [];
    const seen = new Set(out.map(x => `${String(x?.name || '').toUpperCase()}|${String(x?.years || '')}`));
    if (out.length < targetMin) {
        const defaults = duty === 'LD'
            ? (kind === 'engine' ? LD_ENGINE_DEFAULTS : LD_EQUIPMENT_DEFAULTS)
            : (kind === 'engine' ? HD_ENGINE_DEFAULTS : HD_EQUIPMENT_DEFAULTS);
        for (const def of defaults) {
            const key = `${def.name.toUpperCase()}|${def.years}`;
            if (!seen.has(key)) {
                out.push(def);
                seen.add(key);
            }
            if (out.length >= targetMin) break;
        }
    }
    // Limitar a 20 elementos para LD y HD
    return out.slice(0, 20);
}

// Consolidate multiple entries of the same name into one with merged years
function consolidateApps(list) {
    const arr = Array.isArray(list) ? list : [];
    const groups = new Map(); // nameUpper -> { name, yearsSet: Set<string>, parsed: [{start,end,open}]} 

    function parseYears(y) {
        const s = String(y || '').trim();
        if (!s) return null;
        const range = s.match(/^((?:19|20)\d{2})\s*[-–—]\s*((?:19|20)\d{2})$/);
        if (range) {
            const start = parseInt(range[1], 10);
            const end = parseInt(range[2], 10);
            if (!isNaN(start) && !isNaN(end)) return { start, end, open: false };
        }
        const open = s.match(/^((?:19|20)\d{2})\+$/);
        if (open) {
            const start = parseInt(open[1], 10);
            if (!isNaN(start)) return { start, end: null, open: true };
        }
        const single = s.match(/^((?:19|20)\d{2})$/);
        if (single) {
            const year = parseInt(single[1], 10);
            if (!isNaN(year)) return { start: year, end: year, open: false };
        }
        return null;
    }

    for (const item of arr) {
        if (!item || typeof item !== 'object') continue;
        const name = String(item.name || '').trim();
        if (!name) continue;
        const years = String(item.years || '').trim();
        const key = name.toUpperCase();
        if (!groups.has(key)) {
            groups.set(key, { name, yearsSet: new Set(), parsed: [] });
        }
        const g = groups.get(key);
        if (years) g.yearsSet.add(years);
        const parsed = parseYears(years);
        if (parsed) g.parsed.push(parsed);
    }

    const consolidated = [];
    for (const [, g] of groups) {
        let yearsOut = '';
        if (g.parsed.length > 0) {
            let minStart = Infinity;
            let maxEnd = -Infinity;
            let hasOpen = false;
            for (const p of g.parsed) {
                if (p.start < minStart) minStart = p.start;
                if (p.end === null) {
                    hasOpen = true;
                } else {
                    if (p.end > maxEnd) maxEnd = p.end;
                }
            }
            if (minStart !== Infinity) {
                if (hasOpen) {
                    yearsOut = `${minStart}+`;
                } else if (maxEnd !== -Infinity) {
                    yearsOut = minStart === maxEnd ? `${minStart}` : `${minStart}-${maxEnd}`;
                }
            }
        } else if (g.yearsSet.size > 0) {
            // Fallback: concatenate unique strings if unparsable
            yearsOut = Array.from(g.yearsSet).join(', ');
        }
        consolidated.push({ name: g.name, years: yearsOut });
    }
    return consolidated;
}

// ============================================================================
// MAIN DETECTION SERVICE
// ============================================================================

async function detectFilter(rawInput, lang = 'en') {
    try {
        const query = normalize.code(rawInput);

        console.log(`📊 Processing: ${query}`);

        // ---------------------------------------------------------------------
        // PASO 1: VALIDAR CÓDIGO (OEM o Cross-Reference válido)
        // ---------------------------------------------------------------------
        console.log(`🔍 Step 1: Validating code via scrapers...`);
        
        const codeUpper = query.toUpperCase();

        // Initial duty detection by code pattern: FRAM series → LD, else HD
        let duty = /^(CA|CF|CH|PH|TG|XG|HM|G|PS)\d/i.test(codeUpper) ? 'LD' : 'HD';
        console.log(`✅ Duty detected: ${duty} (initial via code pattern)`);

        // Validar código con scrapers
        const scraperResult = await scraperBridge(query, duty);

        if (!scraperResult || !scraperResult.last4) {
            console.log(`❌ Invalid code - not found in OEM/Cross-reference: ${query}`);
            return {
                status: 'NOT_FOUND',
                query_normalized: query,
                message: 'Código no válido - no encontrado en base de datos OEM',
                valid: false
            };
        }

        console.log(`✅ Code validated: ${query} → ${scraperResult.code} (${scraperResult.source})`);

        // ---------------------------------------------------------------------
        // PASO 2: BUSCAR SI YA EXISTE SKU EN GOOGLE SHEET MASTER
        // ---------------------------------------------------------------------
        console.log(`📊 Step 2: Checking Google Sheet Master for existing SKU...`);
        
        try {
            const existingSKU = await searchInSheet(query);
            
            if (existingSKU && existingSKU.found) {
                console.log(`✅ SKU already exists in Master: ${query} → ${existingSKU.sku}`);
                
                return {
                    status: 'OK',
                    found_in_master: true,
                    query_normalized: query,
                    code_input: query,
                    code_oem: existingSKU.code_oem,
                    oem_codes: existingSKU.oem_codes || [],
                    duty: existingSKU.duty,
                    family: existingSKU.family,
                    sku: existingSKU.sku,
                    media: existingSKU.media,
                    source: existingSKU.source,
                    cross_reference: existingSKU.cross_reference || [],
                    applications: existingSKU.applications || [],
                    attributes: existingSKU.attributes || {},
                    message: 'SKU encontrado en catálogo Master'
                };
            }
            
            console.log(`⚠️  SKU not found in Master - will generate new SKU`);
        } catch (sheetError) {
            console.log(`⚠️  Google Sheets lookup error: ${sheetError.message}`);
            // Continue to generate SKU anyway
        }

        // ---------------------------------------------------------------------
        // PASO 3: GENERAR SKU ELIMFILTERS
        // ---------------------------------------------------------------------
        console.log(`🔧 Step 3: Generating new SKU...`);

        // Determine family based on FRAM series or scraper hints
        let family = null;
        if (/^CA/.test(codeUpper)) {
            family = 'AIRE';
        } else if (/^(CF|CH)/.test(codeUpper)) {
            family = 'CABIN';
        } else if (/^(PH|TG|XG|HM)/.test(codeUpper)) {
            family = 'OIL';
        } else if (/^(G|PS)/.test(codeUpper)) {
            family = 'FUEL';
        } else {
            // Use scraper-derived family as hint
            if (duty === 'HD') {
                family = detectFamilyHD(scraperResult.family);
            } else {
                family = detectFamilyLD(scraperResult.family);
            }
        }

        if (!family) {
            console.log(`❌ Family detection failed for ${scraperResult.code}`);
            return noEquivalentFound(query, lang);
        }

        console.log(`✅ Family: ${family}`);

        const sku = generateSKU(family, duty, scraperResult.last4);

        if (!sku || sku.error) {
            console.log(`❌ SKU generation failed: ${sku?.error}`);
            return noEquivalentFound(query, lang);
        }

        console.log(`✅ SKU Generated: ${sku}`);

        // ---------------------------------------------------------------------
        // PASO 4: ENRIQUECER ESPECIFICACIONES (Engines/Equipment) Y GUARDAR EN MASTER
        // ---------------------------------------------------------------------
        console.log(`💾 Step 4: Enriching specs and saving to Google Sheet Master...`);
        let specs;
        try {
            if (duty === 'HD') {
                specs = await extractDonaldsonSpecs(scraperResult.code);
            } else {
                specs = await extractFramSpecs(scraperResult.code);
            }
        } catch (e) {
            specs = getDefaultSpecs(scraperResult.code, scraperResult.source || (duty === 'HD' ? 'DONALDSON' : 'FRAM'));
        }
        
        const rawOEMList = scraperResult.attributes?.oem_numbers || scraperResult.oem || [];
        const rawCross = scraperResult.cross || [];
        const rawEquipApps = specs?.equipment_applications || scraperResult.applications || [];
        const rawEngineApps = specs?.engine_applications || [];
        const oemClean = cleanOEMList(rawOEMList, duty);
        const crossClean = cleanCrossList(rawCross, duty, scraperResult.code, scraperResult.source);
        const equipClean = cleanAppsList(rawEquipApps, duty);
        const engineClean = cleanAppsList(rawEngineApps, duty);
const engineCons = consolidateApps(engineClean);
const equipCons = consolidateApps(equipClean);
// Aplicar preferencia de visualización "Fabricante + Modelo" cuando haya marca detectable
const engineFmt = preferBrandModelFormat(engineCons);
const equipFmt = preferBrandModelFormat(equipCons);
const engineFinal = ensureMinApps(engineFmt, duty, 'engine');
const equipFinal = ensureMinApps(equipFmt, duty, 'equipment');

        const masterData = {
            query_normalized: query,
            code_input: query,
            code_oem: scraperResult.code,
            oem_codes: oemClean,
            duty,
            family,
            sku,
            media: getMedia(family, duty),
            filter_type: family,
            source: scraperResult.source,
            cross_reference: crossClean,
            applications: engineFinal,
            equipment_applications: equipFinal,
            attributes: {
                // Basic attributes from scraper
                ...scraperResult.attributes,
                // Specs from extractor (selected fields)
                height_mm: specs?.dimensions?.height_mm,
                outer_diameter_mm: specs?.dimensions?.outer_diameter_mm,
                thread_size: specs?.dimensions?.thread_size,
                gasket_od_mm: specs?.dimensions?.gasket_od_mm,
                iso_main_efficiency_percent: specs?.performance?.iso_main_efficiency_percent,
                iso_test_method: specs?.performance?.iso_test_method,
                micron_rating: specs?.performance?.micron_rating,
                manufacturing_standards: specs?.technical_details?.manufacturing_standards,
                certification_standards: specs?.technical_details?.certification_standards,
                operating_temperature_min_c: specs?.technical_details?.operating_temperature_min_c,
                operating_temperature_max_c: specs?.technical_details?.operating_temperature_max_c,
                fluid_compatibility: specs?.technical_details?.fluid_compatibility,
                service_life_hours: specs?.technical_details?.service_life_hours,
                
                // Description
                description: scraperResult.family || family,
                type: scraperResult.family,
                style: scraperResult.attributes?.style || 'Standard',
                
                // Default standards
                manufacturing_standards: duty === 'HD' ? 'ISO 9001, ISO/TS 16949' : 'ISO 9001',
                certification_standards: duty === 'HD' ? 'ISO 5011, ISO 4548-12' : 'SAE J806',
                iso_test_method: duty === 'HD' ? 'ISO 5011' : 'SAE J806',
                
                // Operating parameters
                operating_temperature_min_c: '-40',
                operating_temperature_max_c: '100',
                fluid_compatibility: 'Universal',
                disposal_method: 'Recycle according to local regulations',
                service_life_hours: '500',
                manufactured_by: 'ELIMFILTERS'
            },
            last4: scraperResult.last4,
            oem_equivalent: scraperResult.code
        };

        try {
            await appendToSheet(masterData);
            console.log(`✅ Saved to Google Sheet Master: ${sku}`);
        } catch (saveError) {
            console.error(`❌ Failed to save to Google Sheet: ${saveError.message}`);
            // Continue anyway - SKU is generated
        }

        // ---------------------------------------------------------------------
        // PASO 5: RETORNAR INFORMACIÓN COMPLETA A WORDPRESS
        // ---------------------------------------------------------------------
        console.log(`✅ Step 5: Returning complete information to WordPress`);
        
        const oemList = oemClean;
        const primaryOEM = Array.isArray(oemList) && oemList.length ? oemList[0] : '';
        const attributesClean = { ...(scraperResult.attributes || {}) };
        if (attributesClean.media_type) delete attributesClean.media_type;
        // Mezclar especificaciones seleccionadas dentro de attributes para la respuesta
        const specAttrs = {
            height_mm: specs?.dimensions?.height_mm,
            outer_diameter_mm: specs?.dimensions?.outer_diameter_mm,
            thread_size: specs?.dimensions?.thread_size,
            gasket_od_mm: specs?.dimensions?.gasket_od_mm,
            iso_main_efficiency_percent: specs?.performance?.iso_main_efficiency_percent,
            iso_test_method: specs?.performance?.iso_test_method,
            micron_rating: specs?.performance?.micron_rating,
            manufacturing_standards: specs?.technical_details?.manufacturing_standards,
            certification_standards: specs?.technical_details?.certification_standards,
            operating_temperature_min_c: specs?.technical_details?.operating_temperature_min_c,
            operating_temperature_max_c: specs?.technical_details?.operating_temperature_max_c,
            fluid_compatibility: specs?.technical_details?.fluid_compatibility,
            disposal_method: specs?.technical_details?.disposal_method,
            service_life_hours: specs?.technical_details?.service_life_hours,
            manufactured_by: 'ELIMFILTERS'
        };
        const attributesMerged = { ...(scraperResult.attributes || {}), ...specAttrs };

        const response = {
            status: 'OK',
            found_in_master: false,
            newly_generated: true,
            query_normalized: query,
            code_input: query,
            code_oem: primaryOEM,
            oem_codes: oemList,
            duty,
            family,
            sku,
            media: getMedia(family, duty),
            source: scraperResult.source,
            // Ocultar marcas: exponer solo el código homologado (OEM cuando disponible)
            oem_homologated: {
                code: primaryOEM || ''
            },
            cross_reference: crossClean,
            applications: engineFinal,
            engine_applications: engineFinal,
            equipment_applications: equipFinal,
            attributes: attributesMerged,
            message: 'SKU ELIMFILTERS generado y guardado en catálogo Master'
        };

        console.log(`🎉 Detection complete: ${sku}`);
        return response;

    } catch (error) {
        console.error('❌ Detection service error:', error);
        throw error;
    }
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
    detectFilter
};
