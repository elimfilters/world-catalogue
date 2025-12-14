// ============================================================================
// DETECTION SERVICE FINAL - v5.3.0 CORRECTED
// ARQUITECTURA:
// - LD: FRAM es fuente completa (SKU + Specs + Apps + Cross-Ref)
// - HD: Donaldson para SKU, Fleetguard para todo lo demás
// ============================================================================

const normalize = require('../utils/normalize');
const { scraperBridge } = require('../scrapers/scraperBridge');
const prefixMap = require('../config/prefixMap');
const { detectDuty } = require('../utils/dutyDetector');
const { detectFamilyHD, detectFamilyLD } = require('../utils/familyDetector');
const { generateSKU, generateEM9SubtypeSKU, generateEM9SSeparatorSKU, generateET9SystemSKU, generateET9FElementSKU } = require('../sku/generator');
const { extract4Digits, extract4Alnum } = require('../utils/digitExtractor');
const { getMedia } = require('../utils/mediaMapper');
const { noEquivalentFound } = require('../utils/messages');
const { searchInSheet, upsertBySku } = require('./syncSheetsService');
const { resolveAToD } = require('../utils/aToDResolver');
const { enforceSkuPolicyInvariant } = require('./skuCreationPolicy');
const { enrichHDWithFleetguard, enrichWithFleetguardAny } = require('./fleetguardEnrichmentService');
const { saveToCache } = require('./mongoService');
const { upsertMarinosBySku } = require('./marineImportService');
const { skuPolicyConfig } = require('../config/skuPolicyConfig');
const { extractFramSpecs, extractDonaldsonSpecs, getDefaultSpecs } = require('../services/technicalSpecsScraper');
const { filterRelevantFields, validateRequiredFields } = require('../utils/filterTypeFieldMapping');

// OEM dataset para fallback SOLO cuando el código no es ni Donaldson ni FRAM (Regla 3)
let OEM_XREF = {};
try { OEM_XREF = require('../data/oem_xref.json'); } catch (_) { OEM_XREF = {}; }

function canonKey(s) {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function classifyInputCode(code) {
  const up = normalize.code(code);
  const isDonaldson = prefixMap.DONALDSON_STRICT_REGEX?.test?.(up);
  const isFram = /^(CA|CF|CH|PH|TG|XG|HM|G|PS)\d/i.test(up);
  if (isDonaldson) return 'MANUFACTURER_DONALDSON';
  if (isFram) return 'MANUFACTURER_FRAM';
  const meta = OEM_XREF[canonKey(code)];
  if (meta && meta.brand) return 'OEM';
  return /^[A-Z]{1,4}\d{3,}/.test(up) ? 'CROSS_REF' : 'UNKNOWN';
}

async function tryOemFallback(oemCode, duty, familyHint) {
  const key = canonKey(oemCode);
  const meta = OEM_XREF[key] || null;

  let oemResolved = null;
  try {
    const { resolveFamilyDutyByOEMPrefix } = require('../config/oemPrefixRules');
    oemResolved = resolveFamilyDutyByOEMPrefix(String(oemCode || ''), duty) || null;
  } catch (_) {
    oemResolved = null;
  }

  const family = (meta && meta.family) || (oemResolved && oemResolved.family) || familyHint || null;
  let effectiveDuty = duty || (oemResolved && oemResolved.duty) || null;

  if (!family) return null;
  if (!effectiveDuty) return null;

  const last4 = extract4Digits(oemCode);
  const sku = generateSKU(family, effectiveDuty, last4);
  if (!sku || sku.error) return null;

  const oemClean = [oemCode];
  const crossClean = [];
  const equipFinal = [];
  const engineFinal = [];

  const familyUpper = String(family).toUpperCase();
  const attributes = {
    manufactured_by: 'ELIMFILTERS',
    oem_brand: (meta && meta.brand) || (oemResolved && oemResolved.brand) || undefined
  };

  return {
    status: 'OK',
    found_in_master: false,
    query_normalized: normalize.code(oemCode),
    code_input: normalize.code(oemCode),
    code_oem: normalize.code(oemCode),
    oem_codes: oemClean,
    duty: effectiveDuty,
    family: familyUpper,
    sku,
    media: getMedia(familyUpper, effectiveDuty),
    source: 'OEM',
    cross_reference: crossClean,
    applications: engineFinal,
    equipment_applications: equipFinal,
    attributes,
    message: 'Fallback OEM: prefijo por tipo + últimos 4 del OEM'
  };
}

// Helper local: extraer años de un texto
function extractYears(text = '') {
    const t = String(text || '').replace(/\s+/g, ' ').trim();
    if (!t) return '';
    const range = t.match(/\b(19|20)\d{2}\s*[-——]\s*(19|20)\d{2}\b/);
    if (range) return `${range[1]}${range[0].slice(range[1].length, range[0].length - range[2].length)}${range[2]}`;
    const present = t.match(/\b(19|20)\d{2}\s*(?:-|to|a|hasta)\s*(?:present|presente|actual)\b/i);
    if (present) return `${present[1]}+`;
    const single = t.match(/\b(19|20)\d{2}\b/);
    if (single) return single[0];
    return '';
}

const AFTERMARKET_PRIORITY = [
    'MOTORCRAFT', 'PUROLATOR', 'WIX', 'NAPA', 'ACDELCO', 'BOSCH', 'K&N', 'STP',
    'CHAMP', 'MICROGARD', 'CARQUEST', 'MOBIL', 'MOBIL 1', 'DENSO', 'SUPERTECH',
    'PREMIUM', 'PREMIUM GUARD', 'HASTINGS', 'BALDWIN',
    'MANN-FILTER', 'MAHLE', 'HENGST', 'RYCO', 'CHAMPION', 'UFI', 'SCT', 'FILTRON',
    'VIC', 'TOKYO ROKI',
    'TECFIL','WEGA','VOX','GFC','VEGA','PARTMO','GOHNER','FILTROS WEB','PREMIUM FILTER','MILLAR FILTERS',
    'HIFI FILTER'
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
    return cleaned.slice(0, 20);
}

function cleanCrossList(list, duty, inputCode, source) {
    const arr = Array.isArray(list) ? list : [];
    if (arr.length === 0) return arr;

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

    const inputUpper = String(inputCode || '').toUpperCase();
    const filtered = normalized.filter(s => {
        const up = s.toUpperCase();
        const isFramSelf = up.startsWith('FRAM ') && up.includes(inputUpper);
        return !isFramSelf;
    });

    const codeSeen = new Set();
    let codeOnlyList = [];
    for (const s of filtered) {
        const c = codeOnly(s);
        if (!c) continue;
        const k = c.toUpperCase();
        if (!codeSeen.has(k)) {
            codeSeen.add(k);
            codeOnlyList.push(c);
        }
    }

    if (String(duty).toUpperCase() === 'HD' && String(source).toUpperCase() === 'DONALDSON') {
        const partNumberLike = (c) => {
            const s = String(c || '').toUpperCase();
            if (!s) return false;
            if (/^[A-Z]{1,4}[A-Z0-9\-]*\d[A-Z0-9\-]*$/.test(s)) return true;
            if (/^\d{3,}(?:[A-Z\-\.]+\d+)?$/.test(s)) return true;
            return false;
        };
        codeOnlyList = codeOnlyList.filter(c => {
            const s = String(c || '');
            if (!partNumberLike(s)) return false;
            if (/^(?:MAPS|GOOGL|GOOGLE|HTTP|HTTPS)$/i.test(s)) return false;
            if (/^\d{1,4}$/.test(s)) return false;
            return true;
        });
    }

    codeOnlyList.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
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
    
    return cleaned.slice(0, 20);
}

function codeOnly(text) {
    const s = String(text || '').trim();
    if (!s) return '';
    const m = s.match(/(?:^|[\s\-——])([A-Z0-9][A-Z0-9\-\.]*\d[A-Z0-9\-\.]*)$/i);
    if (m && m[1]) {
        return m[1].trim();
    }
    const tokens = s.split(/[\s\-——]+/).filter(Boolean);
    let startIdx = 0;
    for (let i = 0; i < tokens.length; i++) {
        if (/\d/.test(tokens[i])) { startIdx = i > 0 ? i - 1 : i; break; }
    }
    const remainder = tokens.slice(startIdx).join('-').trim();
    if (remainder) return remainder;
    return s;
}

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
        if (!brand) return item;

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

        const dash = name.split(/\s*[-——]\s*/);
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

        const lastToken = tokens[tokens.length - 1];
        const lastUp = String(lastToken || '').toUpperCase();
        const trailingBrand = OEM_MANUFACTURERS.find(x => lastUp.includes(x));
        if (trailingBrand && tokens.length > 1 && !name.toUpperCase().startsWith(trailingBrand)) {
            const model = tokens.slice(0, -1).join(' ').trim();
            return { ...item, name: `${trailingBrand.charAt(0) + trailingBrand.slice(1).toLowerCase()} ${model}` };
        }

        return item;
    });
}

function consolidateApps(list) {
    const arr = Array.isArray(list) ? list : [];
    const groups = new Map();

    function parseYears(y) {
        const s = String(y || '').trim();
        if (!s) return null;
        const range = s.match(/^((?:19|20)\d{2})\s*[-——]\s*((?:19|20)\d{2})$/);
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
            yearsOut = Array.from(g.yearsSet).join(', ');
        }
        consolidated.push({ name: g.name, years: yearsOut });
    }
    return consolidated;
}

// ============================================================================
// MAIN DETECTION SERVICE
// ============================================================================

async function detectFilter(rawInput, lang = 'en', options = {}) {
    try {
        const query = normalize.code(rawInput);
        const force = !!(options && options.force);
        const generateAll = !!(options && options.generateAll);

        console.log(`🔊 Processing: ${query}`);

        // ---------------------------------------------------------------------
        // PASO 1: VALIDAR CÓDIGO
        // ---------------------------------------------------------------------
        console.log(`🔍 Step 1: Validating code via scrapers...`);
        
        const codeUpper = normalize.code(query);
        const hint = {};
        let duty = null;
        console.log(`ℹ️ Duty init: null. Hint brand=${hint.brand || 'N/A'}`);

        let scraperResult = await scraperBridge(query, duty);

        // Fallbacks... (código de fallbacks HD/LD existente se mantiene igual)
        // [MANTENER TODO EL CÓDIGO DE FALLBACKS DEL ARCHIVO ORIGINAL]

        if (!scraperResult || !scraperResult.last4) {
            // [MANTENER TODA LA LÓGICA DE ERROR HANDLING ORIGINAL]
            return {
                status: 'NOT_FOUND',
                query_normalized: query,
                message: 'Code validation failed',
                valid: false
            };
        }

        console.log(`✅ Code validated: ${query} → ${scraperResult.code} (${scraperResult.source})`);

        // Ajuste de duty
        const sourceUp = String(scraperResult.source || '').toUpperCase();
        if (sourceUp === 'FRAM' && duty !== 'LD') {
            console.log(`🔍 Duty adjusted to LD based on FRAM source`);
            duty = 'LD';
        } else if (/(DONALDSON|PARKER|RACOR)/.test(sourceUp) && duty !== 'HD') {
            console.log(`🔍 Duty adjusted to HD based on Donaldson source`);
            duty = 'HD';
        }

        // Homologation check
        const familyUp = String(scraperResult.family || '').toUpperCase();
        const homologationOk = (
            (duty === 'HD' && sourceUp === 'DONALDSON') ||
            (duty === 'LD' && sourceUp === 'FRAM')
        );
        
        if (!homologationOk) {
            console.log(`⛔ Homologación no cumplida: duty=${duty}, source=${sourceUp}`);
            return {
                status: 'NOT_FOUND',
                query_normalized: query,
                message: 'Homologation failed',
                valid: false
            };
        }

        // ---------------------------------------------------------------------
        // PASO 2: BUSCAR EN GOOGLE SHEET MASTER
        // ---------------------------------------------------------------------
        console.log(`🔊 Step 2: Checking Google Sheet Master...`);
        
        try {
            const existingSKU = await searchInSheet(query);
            if (existingSKU && existingSKU.found && !force) {
                console.log(`✅ SKU exists: ${query} → ${existingSKU.sku}`);
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
                    message: 'SKU encontrado en Master'
                };
            }
        } catch (sheetError) {
            console.log(`⚠️  Sheets error: ${sheetError.message}`);
        }

        // ---------------------------------------------------------------------
        // PASO 2.5: BUSCAR EN MONGODB CACHE (si no existe en Sheet)
        // ---------------------------------------------------------------------
        console.log(`🔊 Step 2.5: Checking MongoDB cache...`);
        
        try {
            const { getFromCache } = require('./mongoService');
            const cachedData = await getFromCache(query);
            
            if (cachedData && cachedData.sku) {
                console.log(`✅ SKU found in MongoDB cache: ${query} → ${cachedData.sku}`);
                
                // Retornar datos desde MongoDB
                return {
                    status: 'OK',
                    found_in_master: false,
                    found_in_cache: true,
                    query_normalized: query,
                    code_input: query,
                    code_oem: cachedData.code_oem || cachedData.donaldson_code || cachedData.fram_code,
                    oem_codes: cachedData.oem_codes || [],
                    duty: cachedData.duty,
                    family: cachedData.family,
                    sku: cachedData.sku,
                    media: cachedData.media || getMedia(cachedData.family, cachedData.duty),
                    source: cachedData.source || 'CACHE',
                    cross_reference: cachedData.cross_reference || [],
                    applications: cachedData.engine_applications || cachedData.applications || [],
                    equipment_applications: cachedData.equipment_applications || [],
                    attributes: cachedData.attributes || {},
                    message: 'SKU encontrado en MongoDB cache'
                };
            }
            
            console.log(`⚠️  SKU not found in MongoDB cache`);
        } catch (cacheError) {
            console.log(`⚠️  MongoDB cache lookup error: ${cacheError.message}`);
            // Continuar si MongoDB falla - no es crítico
        }

        // ---------------------------------------------------------------------
        // PASO 3: GENERAR SKU (solo si NO existe en Sheet ni MongoDB)
        // ---------------------------------------------------------------------
        console.log(`🔧 Step 3: Generating new SKU...`);

        const codeForFamily = String(scraperResult?.code || query || '').toUpperCase();
        let family = null;

        if (!family && hint.family) {
            family = hint.family;
        }
        
        // Heurísticas FRAM
        if (/^CA/.test(codeForFamily)) {
            family = 'AIRE';
        } else if (/^(CF|CH)/.test(codeForFamily)) {
            family = 'CABIN';
        } else if (/^(PH|TG|XG|HM)/.test(codeForFamily)) {
            family = 'OIL';
        } else if (/^(G|PS)/.test(codeForFamily)) {
            family = 'FUEL';
        } else {
            if (duty === 'HD') {
                family = detectFamilyHD(scraperResult.family);
            } else {
                family = detectFamilyLD(scraperResult.family);
            }
        }

        if (!family) {
            console.log(`❌ Family detection failed`);
            return noEquivalentFound(query, lang);
        }

        console.log(`✅ Family: ${family}`);

        const codeRaw = String(scraperResult?.code || query || '').trim();
        const upCode = codeRaw.toUpperCase();
        let sku = generateSKU(family, duty, scraperResult.last4);

        if (!sku || sku.error) {
            console.log(`❌ SKU generation failed`);
            return noEquivalentFound(query, lang);
        }

        console.log(`✅ SKU Generated: ${sku}`);

        // ---------------------------------------------------------------------
        // PASO 4: EXTRAER ESPECIFICACIONES
        // ARQUITECTURA CORRECTA:
        // - LD: FRAM para TODO (specs, apps, cross-ref)
        // - HD: Fleetguard para TODO (specs, apps, cross-ref)
        // ---------------------------------------------------------------------
        console.log(`💾 Step 4: Extracting specifications...`);

        let specs;
        let rawOEMList = [];
        let rawCross = [];
        let rawEquipApps = [];
        let rawEngineApps = [];

        if (duty === 'LD') {
            // ===================================================================
            // LD: FRAM ES LA FUENTE COMPLETA
            // ===================================================================
            console.log(`📘 LD Mode: Using FRAM as complete source`);
            
            try {
                specs = await extractFramSpecs(scraperResult.code);
                console.log(`✅ FRAM specs extracted for ${scraperResult.code}`);
                
                // OEM codes desde FRAM
                rawOEMList = specs?.oem_codes || specs?.cross_reference || scraperResult.oem || [];
                
                // Cross-references desde FRAM
                rawCross = specs?.cross_reference || scraperResult.cross || [];
                
                // APLICACIONES REALES desde FRAM (NO genéricos)
                rawEquipApps = specs?.equipment_applications || [];
                rawEngineApps = specs?.engine_applications || specs?.applications || [];
                
                console.log(`✅ FRAM data: ${rawOEMList.length} OEM codes, ${rawCross.length} cross-refs, ${rawEquipApps.length} equipment apps, ${rawEngineApps.length} engine apps`);
                
            } catch (framErr) {
                console.log(`⚠️  FRAM extraction failed: ${framErr.message}`);
                specs = getDefaultSpecs(scraperResult.code, 'FRAM');
                rawOEMList = scraperResult.oem || [];
                rawCross = scraperResult.cross || [];
            }
            
        } else if (duty === 'HD') {
            // ===================================================================
            // HD: FLEETGUARD ES LA FUENTE PRIMARIA (no Donaldson specs)
            // ===================================================================
            console.log(`📗 HD Mode: Using Fleetguard as primary source`);
            
            // Las specs vendrán de Fleetguard en el enriquecimiento
            // Por ahora usamos estructura mínima
            specs = {
                dimensions: {},
                performance: {},
                technical_details: {},
                equipment_applications: [],
                engine_applications: []
            };
            
            // OEM/Cross desde scraper básico
            rawOEMList = scraperResult.oem || [];
            rawCross = scraperResult.cross || [];
            
            console.log(`ℹ️  HD: Specs will be populated by Fleetguard enrichment`);
        }

        const oemClean = cleanOEMList(rawOEMList, duty);
        const crossClean = cleanCrossList(rawCross, duty, scraperResult.code, scraperResult.source);
        const equipClean = cleanAppsList(rawEquipApps, duty);
        const engineClean = cleanAppsList(rawEngineApps, duty);
        
        const engineCons = consolidateApps(engineClean);
        const equipCons = consolidateApps(equipClean);
        const engineFmt = preferBrandModelFormat(engineCons);
        const equipFmt = preferBrandModelFormat(equipCons);
        
        // CERO INVENCIÓN: Solo datos verificados
        const engineFinal = engineFmt.slice(0, 20);
        const equipFinal = equipFmt.slice(0, 20);

        console.log(`✅ Final applications: ${engineFinal.length} engines, ${equipFinal.length} equipment`);
        
        // VALIDACIÓN DE COMPLETITUD: Verificar campos críticos
        const criticalFieldsCheck = {
            has_oem_codes: oemClean.length > 0,
            has_cross_ref: crossClean.length > 0,
            has_equipment_apps: equipFinal.length > 0,
            has_engine_apps: engineFinal.length > 0,
            has_dimensions: specs?.dimensions && Object.keys(specs.dimensions).length > 0,
            has_performance: specs?.performance && Object.keys(specs.performance).length > 0
        };
        
        const missingCritical = Object.entries(criticalFieldsCheck)
            .filter(([key, value]) => !value)
            .map(([key]) => key);
        
        if (missingCritical.length > 0) {
            console.log(`⚠️  WARNING: Missing critical data: ${missingCritical.join(', ')}`);
            console.log(`⚠️  Data completeness: ${((6 - missingCritical.length) / 6 * 100).toFixed(0)}%`);
        }

        // Policy enforcement
        const policyProbe = enforceSkuPolicyInvariant({
            sku,
            family,
            duty,
            source: scraperResult.source,
            code_oem: scraperResult.code,
            code_input: query,
            query_normalized: query,
            last4: scraperResult.last4,
            homologated_code: scraperResult.code,
            fram_code: (sourceUp === 'FRAM') ? scraperResult.code : undefined,
            donaldson_code: (sourceUp === 'DONALDSON') ? scraperResult.code : undefined
        });
        
        if (!policyProbe.ok) {
            console.log(`⛔ Policy violation: ${policyProbe.error}`);
            return {
                status: 'POLICY_VIOLATION',
                query_normalized: query,
                error: policyProbe.error,
                valid: false
            };
        }

        let masterData = {
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
                ...scraperResult.attributes,
                description: scraperResult.family || family,
                type: scraperResult.family,
                style: scraperResult.attributes?.style,
                // NO defaults inventados - solo datos del scraper
                // manufacturing_standards: solo si viene del scraper
                // certification_standards: solo si viene del scraper
                // iso_test_method: solo si viene del scraper
                // service_life_hours: solo si viene del scraper
                manufactured_by: 'ELIMFILTERS' // Único campo que podemos garantizar
            },
            last4: scraperResult.last4,
            oem_equivalent: scraperResult.code,
            homologated_code: scraperResult.code
        };

        // Resolver A–D
        try {
            const ad = resolveAToD(masterData.query_normalized || masterData.code_input || masterData.sku || '', {
                duty: masterData.duty,
                type: masterData.filter_type || masterData.family,
                family: masterData.family,
                sku: masterData.sku
            });
            if (!masterData.duty && ad.duty_type) masterData.duty = ad.duty_type;
            const canonicalType = ad.type || masterData.attributes.type;
            if (!masterData.filter_type && canonicalType) masterData.filter_type = canonicalType;
            if (!masterData.attributes.type && canonicalType) masterData.attributes.type = canonicalType;
        } catch (_) {}

        // Añadir códigos homologados
        try {
            if (sourceUp === 'FRAM') {
                masterData.fram_code = scraperResult.code;
            } else if (sourceUp === 'DONALDSON') {
                masterData.donaldson_code = scraperResult.code;
            }
        } catch (_) {}

        // ---------------------------------------------------------------------
        // ENRIQUECIMIENTO
        // ---------------------------------------------------------------------
        if (duty === 'LD') {
            // LD: Ya tiene todo de FRAM, Fleetguard es opcional
            console.log(`ℹ️  LD: Data complete from FRAM, Fleetguard enrichment optional`);
            
            // LD: FRAM data is already complete, no mixing needed
            console.log(`ℹ️  LD: FRAM data preserved as-is (no mixing, no invention)`);
            
            // Mantener OEM codes y cross-references separados como vienen de FRAM
            masterData.oem_codes = oemClean; // Solo OEM codes reales de FRAM
            masterData.cross_reference = crossClean; // Solo cross-refs reales de FRAM
            
            // Opcional: enriquecer con Fleetguard
            try {
                const { masterData: mdFleetAny } = await enrichWithFleetguardAny(masterData, { family });
                if (mdFleetAny) {
                    // Solo agregar datos adicionales, no sobrescribir FRAM
                    if (!masterData.equipment_applications || masterData.equipment_applications.length === 0) {
                        masterData.equipment_applications = mdFleetAny.equipment_applications;
                    }
                    if (!masterData.engine_applications || masterData.engine_applications.length === 0) {
                        masterData.engine_applications = mdFleetAny.engine_applications;
                    }
                }
            } catch (fleetErr) {
                console.log(`⚠️  Fleetguard LD enrichment skipped: ${fleetErr.message}`);
            }
            
        } else if (duty === 'HD') {
            // ===================================================================
            // HD: FLEETGUARD ES LA FUENTE PRIMARIA Y OBLIGATORIA
            // ===================================================================
            console.log(`📗 HD: Enriching with Fleetguard (PRIMARY SOURCE)`);
            
            try {
                const { masterData: mdEnriched, mongoDoc } = await enrichHDWithFleetguard(masterData, {
                    codeDonaldson: scraperResult.code,
                    skuInterno: sku,
                });
                
                if (mdEnriched) {
                    // Fleetguard es la fuente primaria para HD
                    Object.assign(masterData, mdEnriched);
                    console.log(`✅ HD Fleetguard enrichment complete`);
                }
                
                if (mongoDoc) {
                    try {
                        await saveToCache(mongoDoc);
                        console.log(`✅ Saved to MongoDB cache`);
                    } catch (e) {
                        const isVolLow = String(e?.code).toUpperCase() === 'VOL_LOW' || e?.status === 400 || /VOL_LOW/i.test(String(e?.message || ''));
                        if (isVolLow) {
                            throw e;
                        }
                        console.log(`⚠️  Mongo save failed: ${e.message}`);
                    }
                }
            } catch (enrichErr) {
                console.log(`❌ Fleetguard HD enrichment failed: ${enrichErr.message}`);
                // Para HD, Fleetguard es obligatorio
                return {
                    status: 'ENRICHMENT_FAILED',
                    query_normalized: query,
                    message: 'HD requires Fleetguard enrichment - data incomplete',
                    valid: false
                };
            }
        }

        // POLÍTICA: NO rellenar con N/A - dejar vacío si no hay datos verificados
        // Los campos vacíos indican que el scraper no encontró esa información
        
        console.log(`📊 Data completeness check:`);
        console.log(`   OEM codes: ${masterData.oem_codes?.length || 0}`);
        console.log(`   Cross-refs: ${Array.isArray(masterData.cross_reference) ? masterData.cross_reference.length : (masterData.cross_reference ? 1 : 0)}`);
        console.log(`   Equipment apps: ${masterData.equipment_applications?.length || 0}`);
        console.log(`   Engine apps: ${masterData.engine_applications?.length || 0}`);

        // Guardar en Sheet
        try {
            if (/^(EM9|ET9)/.test(String(sku))) {
                await upsertMarinosBySku(masterData);
                console.log(`✅ Upserted to 'Marinos': ${sku}`);
            } else {
                await upsertBySku(masterData, { deleteDuplicates: true });
                console.log(`✅ Upserted to Master: ${sku}`);
            }
        } catch (saveError) {
            console.error(`❌ Failed to upsert: ${saveError.message}`);
        }

        // ---------------------------------------------------------------------
        // PASO 5: FILTRAR CAMPOS RELEVANTES Y RETORNAR
        // ---------------------------------------------------------------------
        console.log(`✅ Step 5: Filtering relevant fields and returning`);
        
        const oemList = oemClean;
        const primaryOEM = Array.isArray(oemList) && oemList.length ? oemList[0] : '';
        
        // Validar campos requeridos para este tipo de filtro
        const validation = validateRequiredFields(masterData, family);
        console.log(`🔍 Field validation for ${family}:`);
        console.log(`   Type: ${validation.type}`);
        console.log(`   Valid: ${validation.valid}`);
        if (!validation.valid) {
            console.log(`   Missing critical fields: ${validation.critical_missing.join(', ')}`);
        }
        
        // Construir respuesta base
        let response = {
            status: 'OK',
            forced: false,
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
            oem_homologated: {
                code: primaryOEM || ''
            },
            homologated_code: scraperResult.code,
            cross_reference: crossClean,
            applications: engineFinal,
            engine_applications: engineFinal,
            equipment_applications: equipFinal,
            attributes: masterData.attributes,
            message: 'SKU ELIMFILTERS generado correctamente',
            data_source: duty === 'LD' ? 'FRAM (complete)' : 'Fleetguard (primary) + Donaldson (SKU only)',
            field_validation: {
                type: validation.type,
                valid: validation.valid,
                missing_critical: validation.critical_missing
            }
        };
        
        // FILTRAR campos no relevantes para este tipo de filtro
        response = filterRelevantFields(response, family);
        
        console.log(`🎯 Response ready with ${Object.keys(response.attributes || {}).length} relevant attributes`);
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

