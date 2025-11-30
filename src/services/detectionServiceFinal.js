// ============================================================================
// DETECTION SERVICE FINAL - v5.2.0
// Flujo correcto: Validación → Google Sheets → Generación → Guardado → Return
// ============================================================================

const normalize = require('../utils/normalize');
const { scraperBridge } = require('../scrapers/scraperBridge');
const prefixMap = require('../config/prefixMap');
const { detectDuty } = require('../utils/dutyDetector');
const { detectFamilyHD, detectFamilyLD } = require('../utils/familyDetector');
const { generateSKU } = require('../sku/generator');
const { extract4Digits } = require('../utils/digitExtractor');
const { getMedia } = require('../utils/mediaMapper');
const { noEquivalentFound } = require('../utils/messages');
const { searchInSheet, upsertBySku } = require('./syncSheetsService');
const { extractFramSpecs, extractDonaldsonSpecs, getDefaultSpecs } = require('../services/technicalSpecsScraper');
// OEM dataset para fallback SOLO cuando el código no es ni Donaldson ni FRAM (Regla 3)
let OEM_XREF = {};
try { OEM_XREF = require('../data/oem_xref.json'); } catch (_) { OEM_XREF = {}; }

function canonKey(s) {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function classifyInputCode(code) {
  const up = prefixMap.normalize(code);
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
  // Requisito estricto: solo proceder si el OEM está homologado en OEM_XREF
  if (!meta) {
    return null;
  }

  const family = meta.family || familyHint || null;
  if (!family) return null;

  const last4 = extract4Digits(oemCode);
  const sku = generateSKU(family, duty, last4);
  if (!sku || sku.error) return null;

  // Lógica pura: sin persistencia ni datos por defecto
  const oemClean = [oemCode];
  const crossClean = [];
  const equipFinal = [];
  const engineFinal = [];

  const familyUpper = String(family).toUpperCase();
  const attributes = {
    manufactured_by: 'ELIMFILTERS',
    oem_brand: meta?.brand || undefined
  };

  return {
    status: 'OK',
    found_in_master: false,
    query_normalized: normalize.code(oemCode),
    code_input: normalize.code(oemCode),
    code_oem: normalize.code(oemCode),
    oem_codes: oemClean,
    duty,
    family: familyUpper,
    sku,
    media: getMedia(familyUpper, duty),
    source: 'OEM',
    cross_reference: crossClean,
    applications: engineFinal,
    equipment_applications: equipFinal,
    attributes,
    message: 'Fallback OEM homologado: prefijo activo + últimos 4 del OEM'
  };
}

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
    'VIC', 'TOKYO ROKI',
    // Latin America regionals (lower priority)
    'TECFIL','WEGA','VOX','GFC','VEGA','PARTMO','GOHNER','FILTROS WEB','PREMIUM FILTER','MILLAR FILTERS',
    // Europe regional
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

    // Filtro adicional para HD Donaldson: eliminar tokens no parecidos a part numbers
    if (String(duty).toUpperCase() === 'HD' && String(source).toUpperCase() === 'DONALDSON') {
        const partNumberLike = (c) => {
            const s = String(c || '').toUpperCase();
            if (!s) return false;
            // Aceptar patrones comunes: "BRANDCODE" o "BRAND-CODE" con dígitos
            if (/^[A-Z]{1,4}[A-Z0-9\-]*\d[A-Z0-9\-]*$/.test(s)) return true;
            // Aceptar códigos numéricos con separadores típicos
            if (/^\d{3,}(?:[A-Z\-\.]+\d+)?$/.test(s)) return true;
            return false;
        };
        codeOnlyList = codeOnlyList.filter(c => {
            const s = String(c || '');
            if (!partNumberLike(s)) return false;
            if (/^(?:MAPS|GOOGL|GOOGLE|HTTP|HTTPS)$/i.test(s)) return false;
            // Eliminar números puros cortos (<5 dígitos) que suelen ser ruido
            if (/^\d{1,4}$/.test(s)) return false;
            return true;
        });
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

async function detectFilter(rawInput, lang = 'en', options = {}) {
    try {
        const query = normalize.code(rawInput);
        const force = !!(options && options.force);
        const generateAll = !!(options && options.generateAll);

        console.log(`📊 Processing: ${query}`);

        // ---------------------------------------------------------------------
        // PASO 1: VALIDAR CÓDIGO (OEM o Cross-Reference válido)
        // ---------------------------------------------------------------------
        console.log(`🔍 Step 1: Validating code via scrapers...`);
        
        const codeUpper = prefixMap.normalize(query);

        // Initial duty via prefix map hint; fallback to FRAM-pattern LD vs HD
        const hint = prefixMap.resolveBrandFamilyDutyByPrefix(codeUpper) || {};
        let duty = hint.duty || (/^(CA|CF|CH|PH|TG|XG|HM|G|PS)\d/i.test(codeUpper) ? 'LD' : 'HD');
        // Override: ECOGARD cabin 'XC' prefix should be treated as LD
        try {
            const prefixMatch = codeUpper.match(/^([A-Z]{1,4})/);
            const prefix = prefixMatch ? prefixMatch[1] : '';
            if (duty === 'HD' && prefix === 'XC') {
                duty = 'LD';
                console.log('🔄 Duty override → LD for ECOGARD XC prefix');
            }
            // Override: WIX numeric XP series (e.g., 57356XP) are automotive LD
            if (duty === 'HD' && /^\d{5}XP$/.test(codeUpper)) {
                duty = 'LD';
                console.log('🔄 Duty override → LD for WIX XP numeric series');
            }
        } catch (_) {}
        console.log(`✅ Duty detected: ${duty} (init via prefix hint: ${hint.brand || 'N/A'})`);

        // Validar código con scrapers
        let scraperResult = await scraperBridge(query, duty);

        // Fallback HD: cruce curado aftermarket/OEM → Donaldson (ej. BF7633 → P551313)
        if ((!scraperResult || !scraperResult.last4) && duty === 'HD') {
            try {
                const upHD = prefixMap.normalize(query);
                const HD_CURATED_MAP = {
                    'BF7633': 'P551313',
                    // Regla de oro: Caterpillar OEM → Donaldson
                    '1R0750': 'P551311',
                    '8041642': 'P828889'
                };
                const mapped = HD_CURATED_MAP[upHD];
                if (mapped) {
                    const { validateDonaldsonCode } = require('../scrapers/donaldson');
                    const don = await validateDonaldsonCode(mapped);
                    if (don && don.last4) {
                        scraperResult = don;
                        duty = 'HD';
                        console.log(`✅ Canonizado vía cruce curado HD (Baldwin→Donaldson): ${query} → ${mapped}`);
                    }
                }
            } catch (hdCuratedErr) {
                console.log(`⚠️  Error en cruce curado HD: ${hdCuratedErr.message}`);
            }
        }

        // Fallback: intentar resolver OEM→FRAM con mapa curado solo si el duty es LD
        if ((!scraperResult || !scraperResult.last4) && duty === 'LD') {
            try {
                const { resolveFramByCuratedOEM, validateFramCode } = require('../scrapers/fram');
                const framResolved = resolveFramByCuratedOEM(query);
                if (framResolved) {
                    const fr2 = await validateFramCode(framResolved);
                    if (fr2 && fr2.last4) {
                        scraperResult = fr2;
                        duty = 'LD';
                        console.log(`✅ Resuelto vía mapa curado OEM→FRAM (LD): ${query} → ${framResolved}`);
                    }
                }
            } catch (fallbackErr) {
                console.log(`⚠️  Error en fallback OEM→FRAM (LD): ${fallbackErr.message}`);
            }
            // FRAM-first canonicalization for LD cross references (e.g., ECOGARD XC → FRAM CF)
            if (!scraperResult || !scraperResult.last4) {
                try {
                    const { findFramCode } = require('../scrapers/Fram complete');
                    const { validateFramCode } = require('../scrapers/fram');
                    const framX = findFramCode(query);
                    if (framX) {
                        const fr3 = await validateFramCode(framX);
                        if (fr3 && fr3.last4) {
                            scraperResult = fr3;
                            duty = 'LD';
                            console.log(`✅ Canonizado vía cross FRAM (LD): ${query} → ${framX}`);
                        }
                    }
                } catch (crossErr) {
                    console.log(`⚠️  Error en canonicalización LD via FRAM cross: ${crossErr.message}`);
                }
            }
            // ECOGARD → FRAM direct series mapping heuristics (LD): XA#### → CA####
            if (!scraperResult || !scraperResult.last4) {
                try {
                    const up = prefixMap.normalize(query);
                    const m = up.match(/^XA(\d{3,5}[A-Z]?)$/);
                    if (m) {
                        const candidate = `CA${m[1]}`;
                        const { validateFramCode } = require('../scrapers/fram');
                        const fr4 = await validateFramCode(candidate);
                        if (fr4 && fr4.last4) {
                            scraperResult = fr4;
                            duty = 'LD';
                            console.log(`✅ Canonizado vía heurística ECOGARD→FRAM (LD): ${query} → ${candidate}`);
                        }
                    }
                } catch (heurErr) {
                    console.log(`⚠️  Error en heurística XA→CA: ${heurErr.message}`);
                }
            }
            // Excepción LD: ECOGARD S-series (ej. S11880) → usar OEM curado si FRAM no fabrica
            if (!scraperResult || !scraperResult.last4) {
                try {
                    const brandUp = String(hint.brand || '').toUpperCase();
                    const up = prefixMap.normalize(query);
                    const isEcoS = brandUp === 'ECOGARD' && /^S\d{5}$/.test(up);
                    if (isEcoS) {
                        const ECO_S_TO_OEM = {
                            'S11880': ['68507598AA','68498720AA','68490111AA','162127665']
                        };
                        const oems = ECO_S_TO_OEM[up];
                        if (oems && oems.length) {
                            const primaryOEM = oems[0];
                            console.log(`🔁 ECOGARD S-series sin FRAM: usando OEM curado ${primaryOEM} para últimos 4`);
                            const oemFallback = await tryOemFallback(primaryOEM, 'LD', 'OIL');
                            if (oemFallback) {
                                // Simular resultado mínimo para continuar con generación de SKU
                                scraperResult = {
                                    valid: true,
                                    code: primaryOEM,
                                    source: 'OEM',
                                    family: 'OIL',
                                    duty: 'LD',
                                    last4: extract4Digits(primaryOEM)
                                };
                                duty = 'LD';
                                console.log(`✅ Fallback OEM aplicado para ECOGARD ${query}: last4=${scraperResult.last4}`);
                            }
                        }
                    }
                } catch (ecoErr) {
                    console.log(`⚠️  Error en excepción ECOGARD S-series OEM fallback: ${ecoErr.message}`);
                }
            }
        }

        if (!scraperResult || !scraperResult.last4) {
            const codeUpper = prefixMap.normalize(query);
            const looksDonaldson = prefixMap.DONALDSON_STRICT_REGEX.test(codeUpper);
            const looksFram = /^(CA|CF|CH|PH|TG|XG|HM|G|PS)\d/i.test(codeUpper);
            console.log(`❌ Invalid code via scrapers: ${query}. looksDonaldson=${looksDonaldson} looksFram=${looksFram}`);

            // Nueva regla: Si FRAM/Donaldson no lo fabrican, intentar fallback OEM con prefijo + últimos 4
            if (looksDonaldson || looksFram) {
                const famHintA = (prefixMap.resolveBrandFamilyDutyByPrefix(query) || {}).family || hint.family;
                const oemFallbackA = await tryOemFallback(query, duty, famHintA);
                if (oemFallbackA) {
                    console.log(`✅ OEM fallback aplicado (fabricante no fabrica): ${query} → ${oemFallbackA.sku}`);
                    return oemFallbackA;
                }
                return {
                    status: 'NOT_FOUND',
                    query_normalized: query,
                    message: 'Fabricante no fabrica y no hay metadata OEM suficiente para aplicar prefijo + últimos 4.',
                    valid: false
                };
            }

            // Regla: si el duty es HD/LD, exigir homologación del fabricante y NO aplicar fallback OEM
            // Excepción: LD ECOGARD S-series permite fallback OEM curado
            const up2 = prefixMap.normalize(query);
            const hint2 = prefixMap.resolveBrandFamilyDutyByPrefix(up2) || {};
            const brandUp2 = String(hint2.brand || hint.brand || '').toUpperCase();
            const allowEcoSFallback = (duty === 'LD' && brandUp2 === 'ECOGARD' && /^S\d{5}$/.test(up2));
            if (!allowEcoSFallback && (duty === 'HD' || duty === 'LD')) {
                // Intentar regla OEM general antes de abandonar
                const famHintB = (prefixMap.resolveBrandFamilyDutyByPrefix(query) || {}).family || hint.family;
                const oemFallbackB = await tryOemFallback(query, duty, famHintB);
                if (oemFallbackB) {
                    console.log(`✅ OEM fallback aplicado (HD/LD sin homologación): ${query} → ${oemFallbackB.sku}`);
                    return oemFallbackB;
                }
                return {
                    status: 'NOT_FOUND',
                    query_normalized: query,
                    message: 'HD/LD sin homologación y sin OEM detectable para aplicar prefijo + últimos 4.',
                    valid: false
                };
            }
            if (allowEcoSFallback) {
                const ECO_S_TO_OEM = {
                    'S11880': ['68507598AA','68498720AA','68490111AA','162127665']
                };
                const oems2 = ECO_S_TO_OEM[up2];
                if (oems2 && oems2.length) {
                    const primaryOEM2 = oems2[0];
                    const oemFallback2 = await tryOemFallback(primaryOEM2, 'LD', 'OIL');
                    if (oemFallback2) {
                        console.log(`✅ OEM fallback aplicado (Excepción ECOGARD S): ${query} → ${oemFallback2.sku}`);
                        return oemFallback2;
                    }
                }
            }
            // Regla 3: NO HD ni LD (no es Donaldson ni FRAM) → fallback OEM
            const oemFallback = await tryOemFallback(query, duty, hint.family);
            if (oemFallback) {
                console.log(`✅ OEM fallback aplicado (Regla 3): ${query} → ${oemFallback.sku}`);
                return oemFallback;
            }
            return {
                status: 'NOT_FOUND',
                query_normalized: query,
                message: 'Regla 3: NO HD ni LD, pero sin metadata OEM (familia) para generar SKU',
                valid: false
            };
        }

        console.log(`✅ Code validated: ${query} → ${scraperResult.code} (${scraperResult.source})`);

        // Ajuste de duty basado en la fuente resuelta del scraper
        const sourceUp = String(scraperResult.source || '').toUpperCase();
        if (sourceUp === 'FRAM' && duty !== 'LD') {
            console.log(`🔁 Duty adjusted to LD based on FRAM source`);
            duty = 'LD';
        } else if (sourceUp === 'DONALDSON' && duty !== 'HD') {
            console.log(`🔁 Duty adjusted to HD based on Donaldson source`);
            duty = 'HD';
        }

        // Política de homologación: HD requiere DONALDSON, LD requiere FRAM
        const homologationOk = (duty === 'HD' && sourceUp === 'DONALDSON') || (duty === 'LD' && sourceUp === 'FRAM');
        if (!homologationOk) {
            const codeUpper = prefixMap.normalize(query);
            const looksDonaldson = prefixMap.DONALDSON_STRICT_REGEX.test(codeUpper);
            const looksFram = /^(CA|CF|CH|PH|TG|XG|HM|G|PS)\d/i.test(codeUpper);
            console.log(`⛔ Homologación requerida no cumplida: duty=${duty}, source=${sourceUp}. looksDonaldson=${looksDonaldson} looksFram=${looksFram}`);

            // Si parece fabricante, NO fallback OEM (reglas 1 y 2)
            if (looksDonaldson || looksFram) {
                const famHintC = (prefixMap.resolveBrandFamilyDutyByPrefix(query) || {}).family || hint.family;
                const oemFallbackC = await tryOemFallback(query, duty, famHintC);
                if (oemFallbackC) {
                    console.log(`✅ OEM fallback aplicado (no homologación fabricante): ${query} → ${oemFallbackC.sku}`);
                    return oemFallbackC;
                }
                return {
                    status: 'NOT_FOUND',
                    query_normalized: query,
                    message: 'Fabricante no homologado y sin OEM detectable para aplicar prefijo + últimos 4.',
                    valid: false
                };
            }
            // Regla: si el duty es HD/LD, exigir homologación del fabricante y NO aplicar fallback OEM
            // Excepción: LD ECOGARD S-series permite fallback OEM curado
            {
                const up3 = prefixMap.normalize(query);
                const hint3 = prefixMap.resolveBrandFamilyDutyByPrefix(up3) || {};
                const brandUp3 = String(hint3.brand || hint.brand || '').toUpperCase();
                const allowEcoSFallback2 = (duty === 'LD' && brandUp3 === 'ECOGARD' && /^S\d{5}$/.test(up3));
                if (allowEcoSFallback2) {
                    const ECO_S_TO_OEM = {
                        'S11880': ['68507598AA','68498720AA','68490111AA','162127665']
                    };
                    const oems3 = ECO_S_TO_OEM[up3];
                    if (oems3 && oems3.length) {
                        const primaryOEM3 = oems3[0];
                        const oemFallback3 = await tryOemFallback(primaryOEM3, 'LD', 'OIL');
                        if (oemFallback3) {
                            console.log(`✅ OEM fallback aplicado (Excepción ECOGARD S - no homologación): ${query} → ${oemFallback3.sku}`);
                            return oemFallback3;
                        }
                    }
                }
            }
            if (duty === 'HD' || duty === 'LD') {
                const famHintD = (prefixMap.resolveBrandFamilyDutyByPrefix(query) || {}).family || hint.family;
                const oemFallbackD = await tryOemFallback(query, duty, famHintD);
                if (oemFallbackD) {
                    console.log(`✅ OEM fallback aplicado (HD/LD no homologado): ${query} → ${oemFallbackD.sku}`);
                    return oemFallbackD;
                }
                return {
                    status: 'NOT_FOUND',
                    query_normalized: query,
                    message: 'HD/LD sin homologación y sin OEM detectable para aplicar prefijo + últimos 4.',
                    valid: false
                };
            }
            // En caso contrario, aplicar Regla 3
            const oemFallback = await tryOemFallback(query, duty, hint.family);
            if (oemFallback) {
                console.log(`✅ OEM fallback aplicado por no homologación (Regla 3): ${query} → ${oemFallback.sku}`);
                return oemFallback;
            }
            return {
                status: 'NOT_FOUND',
                query_normalized: query,
                message: 'Regla 3: NO HD ni LD, pero sin metadata OEM (familia) para generar SKU',
                valid: false
            };
        }

        // ---------------------------------------------------------------------
        // PRE-CÁLCULO: FAMILIA Y SKU ESPERADO PARA VALIDAR CONTRA MASTER
        // ---------------------------------------------------------------------
        const codeForFamilyPre = String(scraperResult?.code || query || '').toUpperCase();
        let familyPre = null;
        // Preferir hint de familia si viene del prefijo
        if (!familyPre && hint.family) {
            familyPre = hint.family;
        }
        // Heurísticas por prefijo FRAM
        if (/^CA/.test(codeForFamilyPre)) {
            familyPre = 'AIRE';
        } else if (/^(CF|CH)/.test(codeForFamilyPre)) {
            familyPre = 'CABIN';
        } else if (/^(PH|TG|XG|HM)/.test(codeForFamilyPre)) {
            familyPre = 'OIL';
        } else if (/^(G|PS)/.test(codeForFamilyPre)) {
            familyPre = 'FUEL';
        } else {
            // Usar familia derivada del scraper
            if (duty === 'HD') {
                familyPre = detectFamilyHD(scraperResult.family);
            } else {
                familyPre = detectFamilyLD(scraperResult.family);
            }
        }

        // Construir SKU esperado con prefijo oficial y últimos 4 homologados
        const expectedSkuPre = generateSKU(familyPre, duty, scraperResult.last4);

        // ---------------------------------------------------------------------
        // PASO 2: BUSCAR SI YA EXISTE SKU EN GOOGLE SHEET MASTER
        // ---------------------------------------------------------------------
        console.log(`📊 Step 2: Checking Google Sheet Master for existing SKU...`);
        
        try {
            const existingSKU = await searchInSheet(query);

            if (existingSKU && existingSKU.found) {
                if (force) {
                    console.log(`⚙️  FORCE enabled: ignoring Master SKU (${existingSKU.sku}) and regenerating`);
                } else {
                    console.log(`✅ SKU already exists in Master: ${query} → ${existingSKU.sku}`);
                    // Validar contra la homologación actual: familia, duty y últimos 4
                    if (
                        existingSKU.sku === expectedSkuPre &&
                        String(existingSKU.family).toUpperCase() === String(familyPre).toUpperCase() &&
                        String(existingSKU.duty).toUpperCase() === String(duty).toUpperCase()
                    ) {
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
                    // Si no coincide, regenerar y corregir (no retornar aquí)
                    console.log(
                        `♻️  Mismatch de SKU en Master. Esperado: ${expectedSkuPre} (family=${familyPre}, duty=${duty}, last4=${scraperResult.last4}) ` +
                        `pero existe: ${existingSKU.sku}. Se corregirá y se hará upsert.`
                    );
                }
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

        // Determine family based on resolved code (prefer validated FRAM/DONALDSON code)
        const codeForFamily = String(scraperResult?.code || query || '').toUpperCase();
        let family = null;
        // Prefer prefix hint family when available
        if (!family && hint.family) {
            family = hint.family;
        }
        if (/^CA/.test(codeForFamily)) {
            family = 'AIRE';
        } else if (/^(CF|CH)/.test(codeForFamily)) {
            family = 'CABIN';
        } else if (/^(PH|TG|XG|HM)/.test(codeForFamily)) {
            family = 'OIL';
        } else if (/^(G|PS)/.test(codeForFamily)) {
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
            if (force) {
                console.log('⚙️  FORCE mode: applying fallback family heuristics');
                if (/^CA/i.test(codeForFamily)) {
                    family = 'AIRE';
                } else if (/^(CF|CH)/i.test(codeForFamily)) {
                    family = 'CABIN';
                } else if (/^(PH|TG|XG|HM)/i.test(codeForFamily)) {
                    family = 'OIL';
                } else if (/^(G|PS)/i.test(codeForFamily)) {
                    family = 'FUEL';
                } else {
                    family = 'OIL';
                }
                console.log(`✅ FORCE fallback family: ${family}`);
            } else {
                return noEquivalentFound(query, lang);
            }
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
        
        const rawOEMList = [
            ...(Array.isArray(scraperResult.attributes?.oem_numbers) ? scraperResult.attributes.oem_numbers : (scraperResult.oem || [])),
            ...((specs?.technical_details?.oem_codes) || (specs?.oem_codes) || [])
        ];
        const rawCross = [
            ...(scraperResult.cross || []),
            ...((specs?.technical_details?.cross_reference) || (specs?.cross_reference) || [])
        ];
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
                inner_diameter_mm: specs?.dimensions?.inner_diameter_mm,
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
            await upsertBySku(masterData, { deleteDuplicates: true });
            console.log(`✅ Upserted to Google Sheet Master: ${sku}`);
        } catch (saveError) {
            console.error(`❌ Failed to upsert to Google Sheet: ${saveError.message}`);
            // Continue anyway - SKU is generated
        }

        // -----------------------------------------------------------------
        // Optional: generate SKUs for all associated homologated codes
        // -----------------------------------------------------------------
        let generatedAllSummary = [];
        if (generateAll) {
            console.log(`🧩 generate_all enabled: attempting homologated SKUs for associated codes...`);
            const candidates = new Set([...(Array.isArray(oemClean) ? oemClean : []), ...(Array.isArray(crossClean) ? crossClean : [])]);
            // Remove primary OEM and the input query to avoid duplicates
            candidates.delete(scraperResult.code);
            candidates.delete(query);

            for (const cand of candidates) {
                const cQuery = normalize.code(cand);
                if (!cQuery || cQuery.length < 3) continue;
                try {
                    const sr = await scraperBridge(cQuery, duty);
                    if (!sr || !sr.last4) {
                        console.log(`↪️  Skipping ${cQuery}: not validated by scrapers`);
                        continue;
                    }
                    const srcUp = String(sr.source || '').toUpperCase();
                    const homologOk = (duty === 'HD' && srcUp === 'DONALDSON') || (duty === 'LD' && srcUp === 'FRAM');
                    if (!homologOk) {
                        console.log(`↪️  Skipping ${cQuery}: source ${srcUp} not homologated for duty ${duty}`);
                        continue;
                    }

                    // Determine family for the candidate; fallback to primary family
                    let famCand = null;
                    const cUpper = cQuery.toUpperCase();
                    if (/^CA/.test(cUpper)) {
                        famCand = 'AIRE';
                    } else if (/^(CF|CH)/.test(cUpper)) {
                        famCand = 'CABIN';
                    } else if (/^(PH|TG|XG|HM)/.test(cUpper)) {
                        famCand = 'OIL';
                    } else if (/^(G|PS)/.test(cUpper)) {
                        famCand = 'FUEL';
                    } else {
                        famCand = duty === 'HD' ? detectFamilyHD(sr.family) : detectFamilyLD(sr.family);
                    }
                    if (!famCand) famCand = family;

                    const skuCand = generateSKU(famCand, duty, sr.last4);
                    if (!skuCand || skuCand.error) {
                        console.log(`↪️  Skipping ${cQuery}: SKU generation error`);
                        continue;
                    }

                    const specsCand = getDefaultSpecs(sr.code, sr.source);
                    const oemCand = cleanOEMList(sr.attributes?.oem_numbers || sr.oem || [], duty);
                    const crossCand = cleanCrossList(sr.cross || [], duty, sr.code, sr.source);

                    const masterDataCand = {
                        query_normalized: cQuery,
                        code_input: cQuery,
                        code_oem: sr.code,
                        oem_codes: oemCand,
                        duty,
                        family: famCand,
                        sku: skuCand,
                        media: getMedia(famCand, duty),
                        filter_type: famCand,
                        source: sr.source,
                        cross_reference: crossCand,
                        applications: ensureMinApps(preferBrandModelFormat(consolidateApps(cleanAppsList(specsCand?.engine_applications || [], duty))), duty, 'engine'),
                        equipment_applications: ensureMinApps(preferBrandModelFormat(consolidateApps(cleanAppsList(specsCand?.equipment_applications || [], duty))), duty, 'equipment'),
                        attributes: {
                            ...sr.attributes,
                            height_mm: specsCand?.dimensions?.height_mm,
                            outer_diameter_mm: specsCand?.dimensions?.outer_diameter_mm,
                            thread_size: specsCand?.dimensions?.thread_size,
                            gasket_od_mm: specsCand?.dimensions?.gasket_od_mm,
                            iso_main_efficiency_percent: specsCand?.performance?.iso_main_efficiency_percent,
                            iso_test_method: specsCand?.performance?.iso_test_method,
                            micron_rating: specsCand?.performance?.micron_rating,
                            manufacturing_standards: duty === 'HD' ? 'ISO 9001, ISO/TS 16949' : 'ISO 9001',
                            certification_standards: duty === 'HD' ? 'ISO 5011, ISO 4548-12' : 'SAE J806',
                            operating_temperature_min_c: '-40',
                            operating_temperature_max_c: '100',
                            fluid_compatibility: 'Universal',
                            disposal_method: 'Recycle according to local regulations',
                            service_life_hours: '500',
                            manufactured_by: 'ELIMFILTERS'
                        },
                        last4: sr.last4,
                        oem_equivalent: sr.code
                    };

                    try {
                        await upsertBySku(masterDataCand, { deleteDuplicates: true });
                        console.log(`✅ Upserted associated homologated SKU: ${skuCand} for ${cQuery}`);
                        generatedAllSummary.push({ code: cQuery, sku: skuCand, source: sr.source, forced: false, upsert_status: 'SAVED' });
                    } catch (errUp) {
                        console.log(`⚠️  Failed upsert for ${cQuery}: ${errUp.message}`);
                        generatedAllSummary.push({ code: cQuery, sku: skuCand, source: sr.source, forced: false, upsert_status: 'UPSERT_FAILED', error: errUp.message });
                    }
                } catch (err) {
                    console.log(`⚠️  Error processing ${cQuery}: ${err.message}`);
                }
            }
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
            inner_diameter_mm: specs?.dimensions?.inner_diameter_mm,
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
            pleat_count: specs?.technical_details?.pleat_count,
            seal_material: specs?.technical_details?.seal_material,
            housing_material: specs?.technical_details?.housing_material,
            manufactured_by: 'ELIMFILTERS'
        };
        const attributesMerged = { ...(scraperResult.attributes || {}), ...specAttrs };

        const response = {
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
            // Ocultar marcas: exponer solo el código homologado (OEM cuando disponible)
            oem_homologated: {
                code: primaryOEM || ''
            },
            cross_reference: crossClean,
            applications: engineFinal,
            engine_applications: engineFinal,
            equipment_applications: equipFinal,
            attributes: attributesMerged,
            message: 'SKU ELIMFILTERS generado y guardado en catálogo Master',
            generated_all: generatedAllSummary
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

