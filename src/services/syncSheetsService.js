// ============================================================================
// GOOGLE SHEETS SYNC SERVICE - FINAL
// Google Sheet Master: 1ZYI5c0enkuvWAveu8HMaCUk1cek_VDrX8GtgKW7VP6U
// ============================================================================

const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
// Load env locally; attempt parent resolution if needed
try { require('dotenv').config(); } catch (_) {}
const path = require('path');
if (!process.env.GOOGLE_CREDENTIALS && !process.env.GOOGLE_PRIVATE_KEY) {
    try {
        const altEnvPath = path.join(__dirname, '../../../.env');
        require('dotenv').config({ path: altEnvPath });
        if (process.env.GOOGLE_CREDENTIALS || process.env.GOOGLE_PRIVATE_KEY) {
            console.log('🔧 Loaded env from parent .env');
        }
    } catch (_) {}
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const SHEET_ID = process.env.GOOGLE_SHEETS_ID || '1ZYI5c0enkuvWAveu8HMaCUk1cek_VDrX8GtgKW7VP6U';

// Column mapping (new exact headers from Sheet Master)
const COLUMNS = {
    QUERY_NORM: 'query_norm',
    SKU: 'sku',
    DUTY: 'duty',
    TYPE: 'type',
    SUBTYPE: 'subtype',
    DESCRIPTION: 'description',
    OEM_CODES: 'oem_codes',
    CROSS_REFERENCE: 'cross_reference',
    MEDIA_TYPE: 'media_type',
    EQUIPMENT_APPLICATIONS: 'equipment_applications',
    ENGINE_APPLICATIONS: 'engine_applications',
    HEIGHT_MM: 'height_mm',
    OUTER_DIAMETER_MM: 'outer_diameter_mm',
    THREAD_SIZE: 'thread_size',
    MICRON_RATING: 'micron_rating',
    OPERATING_TEMPERATURE_MIN_C: 'operating_temperature_min_c',
    OPERATING_TEMPERATURE_MAX_C: 'operating_temperature_max_c',
    FLUID_COMPATIBILITY: 'fluid_compatibility',
    DISPOSAL_METHOD: 'disposal_method',
    GASKET_OD_MM: 'gasket_od_mm',
    GASKET_ID_MM: 'gasket_id_mm',
    BYPASS_VALVE_PSI: 'bypass_valve_psi',
    BETA_200: 'beta_200',
    HYDROSTATIC_BURST_PSI: 'hydrostatic_burst_psi',
    DIRT_CAPACITY_GRAMS: 'dirt_capacity_grams',
    RATED_FLOW_GPM: 'rated_flow_gpm',
    RATED_FLOW_CFM: 'rated_flow_cfm',
    OPERATING_PRESSURE_MIN_PSI: 'operating_pressure_min_psi',
    OPERATING_PRESSURE_MAX_PSI: 'operating_pressure_max_psi',
    WEIGHT_GRAMS: 'weight_grams',
    PANEL_WIDTH_MM: 'panel_width_mm',
    PANEL_DEPTH_MM: 'panel_depth_mm',
    WATER_SEPARATION_EFFICIENCY_PERCENT: 'water_separation_efficiency_percent',
    DRAIN_TYPE: 'drain_type',
    INNER_DIAMETER_MM: 'inner_diameter_mm',
    PLEAT_COUNT: 'pleat_count',
    SEAL_MATERIAL: 'seal_material',
    HOUSING_MATERIAL: 'housing_material',
    ISO_MAIN_EFFICIENCY_PERCENT: 'iso_main_efficiency_percent',
    ISO_TEST_METHOD: 'iso_test_method',
    MANUFACTURING_STANDARDS: 'manufacturing_standards',
    CERTIFICATION_STANDARDS: 'certification_standards',
    SERVICE_LIFE_HOURS: 'service_life_hours',
    CHANGE_INTERVAL_KM: 'change_interval_km'
};

// Desired header order in the Google Sheet
const DESIRED_HEADERS = [
    'query_norm',
    'sku',
    'duty',
    'type',
    'subtype',
    'description',
    'oem_codes',
    'cross_reference',
    'media_type',
    'equipment_applications',
    'engine_applications',
    'height_mm',
    'outer_diameter_mm',
    'thread_size',
    'micron_rating',
    'operating_temperature_min_c',
    'operating_temperature_max_c',
    'fluid_compatibility',
    'disposal_method',
    'gasket_od_mm',
    'gasket_id_mm',
    'bypass_valve_psi',
    'beta_200',
    'hydrostatic_burst_psi',
    'dirt_capacity_grams',
    'rated_flow_gpm',
    'rated_flow_cfm',
    'operating_pressure_min_psi',
    'operating_pressure_max_psi',
    'weight_grams',
    'panel_width_mm',
    'panel_depth_mm',
    'water_separation_efficiency_percent',
    'drain_type',
    'inner_diameter_mm',
    'pleat_count',
    'seal_material',
    'housing_material',
    'iso_main_efficiency_percent',
    'iso_test_method',
    'manufacturing_standards',
    'certification_standards',
    'service_life_hours',
    'change_interval_km'
];

// ============================================================================
// Descripciones ELIMFILTERS - Diccionario (Prefijo + Línea)
// ============================================================================
const STOP_WORDS = [
    'AIRE', 'AIR', 'OIL', 'ACEITE', 'FUEL', 'COMBUSTIBLE', 'CABINA', 'CABIN',
    'LUBE', 'ELEMENTO', 'FILTRO'
];

const DESCRIPCIONES_ELIMFILTERS = {
    AIR_PRECISION: 'Filtración MACROCORE™ PRECISION para LD con alta eficiencia y flujo estable. Medio Filtrante Genuino. Desarrollado con IA.',
    AIR_INDUSTRIAL: 'Protección MACROCORE™ INDUSTRIAL para HD con nanofibra OptiFlow™ en entornos severos y elementos de seguridad. Medio Filtrante Genuino. Desarrollado con IA.',
    OIL_SYNTHETIC: 'ELIMTEK™ SYNTHETIC: Medio sintético de precisión 99% @ 20µ para HD y series XG con performance extendido. Medio Filtrante Genuino. Desarrollado con IA.',
    OIL_ADVANCED: 'ELIMTEK™ ADVANCED: Celulosa blend reforzada 97% @ 25µ, óptimo para LD y series TG/HM. Balance entre eficiencia y capacidad. Medio Filtrante Genuino. Desarrollado con IA.',
    FUEL_ULTRA: 'ELIMTEK™ ULTRA: Multi-capa 99.5% @ 4µ con separación de agua >95% para HD/PS-series en sistemas diésel exigentes. Medio Filtrante Genuino. Desarrollado con IA.',
    FUEL_ADVANCED: 'ELIMTEK™ ADVANCED: Filtración de combustible LD con blend reforzada, eficiencia y costo optimizados. Medio Filtrante Genuino. Desarrollado con IA.',
    CABIN_PREMIUM: 'MICROKAPPA™ PREMIUM: Carbón activado y sistema multietapa para purificación avanzada del habitáculo. Medio Filtrante Genuino. Desarrollado con IA.',
    CABIN_PURE: 'MICROKAPPA™ PURE: Electrostático multi-capa de alta eficiencia para aire de cabina estándar. Medio Filtrante Genuino. Desarrollado con IA.',
    HYDRAULIC_ULTRA: 'ELIMTEK™ ULTRA: Filtración hidráulica de alta presión con nano-fibra multi-capa en líneas de presión/retorno. Medio Filtrante Genuino. Desarrollado con IA.',
    COOLANT_SYNTHETIC: 'ELIMTEK™ SYNTHETIC: Control de refrigerante con medio sintético de precisión, compatible con sistemas con o sin aditivos SCA. Medio Filtrante Genuino. Desarrollado con IA.',
    AIR_DRYER_ULTRA: 'ELIMTEK™ ULTRA: Cartucho secador de aire con desecante de alto desempeño para aire comprimido y sistemas de frenado. Medio Filtrante Genuino. Desarrollado con IA.',
    MARINE_ULTRA: 'ELIMTEK™ ULTRA: Filtración marina Heavy Duty, separación agua/combustible y protección crítica de motores. Medio Filtrante Genuino. Desarrollado con IA.'
};

// Garantiza el lenguaje mandatorio en descripciones de fallback
const ensureBrandPhrasing = (text) => {
    let t = String(text || '').trim();
    const hasMedio = /medio filtrante genuino/i.test(t);
    const hasIA = /desarrollado con ia/i.test(t);
    if (!hasMedio) t += (t ? ' ' : '') + 'Medio Filtrante Genuino.';
    if (!hasIA) t += (t ? ' ' : '') + 'Desarrollado con IA.';
    return t;
};

// Medias y líneas desde util de producto
let getProductMedia;
try {
    // Utiliza el mapeo detallado (familia+duty+serie)
    ({ getMedia: getProductMedia } = require('../utils/Mediamapper · JS'));
} catch (_) {
    // Fallback al mapeo simple por familia
    ({ getMedia: getProductMedia } = require('../utils/mediaMapper'));
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

async function initSheet() {
    try {
        const doc = new GoogleSpreadsheet(SHEET_ID);

        // Prefer JSON credentials if provided
        const credsRaw = process.env.GOOGLE_CREDENTIALS;
        if (credsRaw) {
            let creds;
            try {
                creds = JSON.parse(credsRaw);
            } catch (e) {
                throw new Error('Invalid GOOGLE_CREDENTIALS JSON');
            }
            if (creds.private_key) {
                creds.private_key = creds.private_key.replace(/\\n/g, '\n');
            }
            await doc.useServiceAccountAuth({
                client_email: creds.client_email,
                private_key: creds.private_key
            });
        } else if ((process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL) && process.env.GOOGLE_PRIVATE_KEY) {
            // Fallback to explicit env vars (support both GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_CLIENT_EMAIL)
            const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
            const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
            await doc.useServiceAccountAuth({
                client_email: clientEmail,
                private_key: privateKey
            });
        } else {
            throw new Error('Missing Google Sheets credentials: set GOOGLE_CREDENTIALS or GOOGLE_SERVICE_ACCOUNT_EMAIL/GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY');
        }

        await doc.loadInfo();
        console.log(`📊 Google Sheet Master loaded: ${doc.title}`);
        return doc;

    } catch (error) {
        console.error('❌ Error initializing Google Sheet:', error.message);
        throw error;
    }
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Search for a code in Google Sheets Master
 * @param {string} code - Code to search
 * @returns {object|null} - Found filter or null
 */
async function searchInSheet(code) {
    try {
        const doc = await initSheet();
        const sheet = doc.sheetsByIndex[0];
        
        const rows = await sheet.getRows();
        const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');

        // Safe accessor for environments without row.get()
        const getCell = (r, key) => {
            try {
                if (r && typeof r.get === 'function') return r.get(key);
                return r ? r[key] : undefined;
            } catch (_) { return undefined; }
        };

        for (const row of rows) {
            const queryNorm = getCell(row, 'query_norm')?.toUpperCase().replace(/[^A-Z0-9]/g, '');
            const sku = getCell(row, 'sku')?.toUpperCase().replace(/[^A-Z0-9]/g, '');

            // oem_codes may be a JSON array string; support matching any element
            const oemRaw = getCell(row, 'oem_codes');
            let oemMatch = false;
            try {
                const arr = typeof oemRaw === 'string' ? JSON.parse(oemRaw) : Array.isArray(oemRaw) ? oemRaw : [];
                if (Array.isArray(arr)) {
                    oemMatch = arr.some(v => String(v).toUpperCase().replace(/[^A-Z0-9]/g, '') === normalizedCode);
                }
            } catch (_) {
                const parts = String(oemRaw || '')
                    .split(',')
                    .map(s => s.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''))
                    .filter(Boolean);
                oemMatch = parts.includes(normalizedCode);
            }

            // cross_reference may also be stored as text now; match any element
            const crossRaw = getCell(row, 'cross_reference');
            let crossMatch = false;
            try {
                const arr = typeof crossRaw === 'string' ? JSON.parse(crossRaw) : Array.isArray(crossRaw) ? crossRaw : [];
                if (Array.isArray(arr)) {
                    crossMatch = arr.some(v => String(v).toUpperCase().replace(/[^A-Z0-9]/g, '') === normalizedCode);
                }
            } catch (_) {
                const parts = String(crossRaw || '')
                    .split(',')
                    .map(s => s.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''))
                    .filter(Boolean);
                crossMatch = parts.includes(normalizedCode);
            }

            if (queryNorm === normalizedCode || 
                oemMatch || crossMatch || 
                sku === normalizedCode) {
                
                console.log(`📊 Found in Google Sheet Master: ${code} → ${getCell(row, 'sku')}`);
                
                return {
                    found: true,
                    query_norm: getCell(row, 'query_norm'),
                    sku: getCell(row, 'sku'),
                    description: getCell(row, 'description'),
                    family: getCell(row, 'family'),
                    duty: getCell(row, 'duty'),
                    oem_codes: tryParseJSON(getCell(row, 'oem_codes')),
                    cross_reference: tryParseJSON(getCell(row, 'cross_reference')),
                    media_type: getCell(row, 'media_type'),
                    filter_type: getCell(row, 'filter_type'),
                    subtype: getCell(row, 'subtype'),
                    engine_applications: tryParseJSON(getCell(row, 'engine_applications')),
                    equipment_applications: tryParseJSON(getCell(row, 'equipment_applications')),
                    attributes: {
                        height_mm: getCell(row, 'height_mm'),
                        outer_diameter_mm: getCell(row, 'outer_diameter_mm'),
                        thread_size: getCell(row, 'thread_size'),
                        gasket_od_mm: getCell(row, 'gasket_od_mm'),
                        gasket_id_mm: getCell(row, 'gasket_id_mm'),
                        bypass_valve_psi: getCell(row, 'bypass_valve_psi'),
                        micron_rating: getCell(row, 'micron_rating'),
                        weight_grams: getCell(row, 'weight_grams')
                    },
                    source: getCell(row, 'source'),
                    homologated_sku: getCell(row, 'homologated_sku'),
                    all_cross_references: tryParseJSON(getCell(row, 'all_cross_references'))
                };
            }
        }

        return null;

    } catch (error) {
        console.error('❌ Error searching Google Sheet:', error.message);
        return null;
    }
}

// ============================================================================
// WRITE OPERATIONS
// ============================================================================

// Ensure headers match the desired order and names
async function ensureHeaders(sheet) {
    try {
        const current = Array.isArray(sheet.headerValues) ? sheet.headerValues : [];
        const mismatch = current.length !== DESIRED_HEADERS.length || current.some((h, i) => h !== DESIRED_HEADERS[i]);
        if (mismatch) {
            await sheet.setHeaderRow(DESIRED_HEADERS);
            console.log('🧭 Sheet headers updated to new structure');
        }
    } catch (e) {
        console.warn(`⚠️ Could not verify/update headers: ${e.message}`);
    }
}

/**
 * Build row data according to exact column structure
 */
function buildRowData(data) {
    const attrs = data.attributes || {};
    // Helper: join list values into readable comma-separated string
    const formatList = (list) => {
        const arr = Array.isArray(list) ? list : (list ? [list] : []);
        return Array.from(
            new Set(
                arr
                    .map(v => typeof v === 'string' ? v : (v?.toString?.() || ''))
                    .map(s => s.trim())
                    .filter(Boolean)
            )
        ).join(', ');
    };
    // Helper: format applications [{name, years}] → "Name (Years)"
    const formatApps = (apps) => {
        const arr = Array.isArray(apps) ? apps : [];
        const items = arr.map(a => {
            const name = (a && a.name) ? String(a.name).trim() : '';
            const years = (a && a.years) ? String(a.years).trim() : '';
            if (!name) return '';
            return years ? `${name} (${years})` : name;
        }).filter(Boolean);
        return Array.from(new Set(items)).join(', ');
    };
    // Normalize dimension strings like "10.24 inch (260 mm)" → "260"
    const normalizeMM = (v) => {
        const s = String(v || '').trim();
        if (!s) return '';
        // Prefer mm inside parentheses
        const mmParen = s.match(/\(([^)]+)\)/); // inside parentheses
        if (mmParen && /mm/i.test(mmParen[1])) {
            const num = mmParen[1].match(/([0-9]+(?:\.[0-9]+)?)/);
            if (num) return num[1];
        }
        // Direct mm
        const mmDirect = s.match(/([0-9]+(?:\.[0-9]+)?)\s*mm\b/i);
        if (mmDirect) return mmDirect[1];
        // Inches → mm (allow 'inch', 'in', or ")
        const inchMatch = s.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:inch|in|\")/i);
        if (inchMatch) {
            const mm = parseFloat(inchMatch[1]) * 25.4;
            if (!isNaN(mm)) return mm.toFixed(2);
        }
        // Centimeters → mm
        const cmMatch = s.match(/([0-9]+(?:\.[0-9]+)?)\s*cm\b/i);
        if (cmMatch) {
            const mm = parseFloat(cmMatch[1]) * 10;
            if (!isNaN(mm)) return mm.toFixed(2);
        }
        // If only a number, treat as mm
        const justNum = s.match(/^([0-9]+(?:\.[0-9]+)?)$/);
        if (justNum) return justNum[1];
        // Try to find a standalone number before units
        const anyNum = s.match(/([0-9]+(?:\.[0-9]+)?)/);
        if (anyNum) return anyNum[1];
        return ''; // enforce numeric-only output; empty if unparsable
    };
    // Normalize pressure to PSI from various units and formats
    const normalizePressureToPsi = (v) => {
        let s = String(v || '').trim();
        if (!s) return NaN;
        // Unify decimal separators and remove degree or extra symbols
        s = s.replace(/[°º]/g, '').replace(/,/g, '.');
        const lower = s.toLowerCase();
        // Prefer inside parentheses if it mentions psi
        const paren = s.match(/\(([^)]+)\)/);
        if (paren && /psi\b/.test(paren[1].toLowerCase())) {
            const m = paren[1].match(/([0-9]+(?:\.[0-9]+)?)/);
            const vpsi = m ? parseFloat(m[1]) : NaN;
            return isNaN(vpsi) ? NaN : vpsi;
        }
        // PSI explicit
        let m = s.match(/([0-9]+(?:\.[0-9]+)?)\s*psi\b/i);
        if (m) {
            const vpsi = parseFloat(m[1]);
            return isNaN(vpsi) ? NaN : vpsi;
        }
        // bar → psi (1 bar ≈ 14.5 psi)
        m = s.match(/([0-9]+(?:\.[0-9]+)?)\s*bar\b/i);
        if (m) {
            const vbar = parseFloat(m[1]);
            const psi = vbar * 14.5;
            return isNaN(psi) ? NaN : psi;
        }
        // kPa → psi (1 kPa ≈ 0.145 psi)
        m = s.match(/([0-9]+(?:\.[0-9]+)?)\s*kpa\b/i);
        if (m) {
            const vkpa = parseFloat(m[1]);
            const psi = vkpa * 0.145;
            return isNaN(psi) ? NaN : psi;
        }
        // Range like "12-16" assume first token
        m = s.match(/([0-9]+(?:\.[0-9]+)?)/);
        const tok = m ? parseFloat(m[1]) : NaN;
        return isNaN(tok) ? NaN : tok; // assume PSI if no unit given
    };
    // Normalize Beta ratio (β) to numeric value
    const normalizeBetaRatio = (v) => {
        let s = String(v || '').trim();
        if (!s) return NaN;
        // Remove common labels and symbols, unify decimal
        s = s.replace(/[,]/g, '.');
        s = s.replace(/[βΒ]/g, 'beta');
        s = s.replace(/\b(beta|ratio|value|valor)\b/gi, '').trim();
        // Prefer number after '=' if present
        let m = s.match(/=\s*([0-9]+(?:\.[0-9]+)?)/);
        if (m) {
            const val = parseFloat(m[1]);
            return isNaN(val) ? NaN : val;
        }
        // Fallback: first standalone number
        m = s.match(/([0-9]+(?:\.[0-9]+)?)/);
        const tok = m ? parseFloat(m[1]) : NaN;
        return isNaN(tok) ? NaN : tok;
    };
    // Normalize thread size to standard formats
    // Metric: M<diam> x <pitch>  (e.g., M20 x 1.5)
    // Inch UN/UNF/UNC: <inch>"-<tpi> [UNF|UNC|UN] (e.g., 3/4"-16 UNF)
    const normalizeThreadSize = (v) => {
        let s = String(v || '').trim();
        if (!s) return '';
        // Remove descriptive words
        s = s.replace(/\b(internal|external|female|male|nominal|thread(ed)?|port size|rosca interna|rosca externa|hembra|macho)\b/gi, '').trim();
        // Common separators normalization
        s = s.replace(/×/g, 'x').replace(/\s{2,}/g, ' ').trim();
        // Metric patterns: require explicit 'M' prefix OR 'mm' unit to avoid fraction confusion
        let m = s.match(/\bM\s*([0-9]+(?:\.[0-9]+)?)\s*(?:x|-)\s*([0-9]+(?:\.[0-9]+)?)\b/i);
        if (m) {
            const diam = m[1];
            const pitch = m[2];
            return `M${diam} x ${pitch}`;
        }
        m = s.match(/\b([0-9]+(?:\.[0-9]+)?)\s*mm\s*(?:x|-)\s*([0-9]+(?:\.[0-9]+)?)\b/i);
        if (m) {
            const diam = m[1];
            const pitch = m[2];
            return `M${diam} x ${pitch}`;
        }
        // Inch fraction or decimal with optional TPI and classification
        // e.g., 3/4"-16 UNF, 3/4-16 tpi, 1.0 in - 12 TPI UNC
        m = s.match(/\b([0-9]+(?:\/[0-9]+|(?:\.[0-9]+)?))\s*(?:\"|inch|in)?\s*(?:x|-)?\s*([0-9]{1,2})\s*(?:tpi)?\s*(UNF|UNC|UN)?\b/i);
        if (m) {
            const diamIn = m[1];
            const tpi = m[2];
            const cls = (m[3] || '').toUpperCase();
            const base = `${diamIn.replace(/\s+/g, '')}\"-${tpi}`;
            return cls ? `${base} ${cls}` : base;
        }
        // Already formatted metric like "M20x1.5" → normalize spacing
        m = s.match(/\bM\s*([0-9]+(?:\.[0-9]+)?)\s*[x-]\s*([0-9]+(?:\.[0-9]+)?)\b/i);
        if (m) {
            return `M${m[1]} x ${m[2]}`;
        }
        // Last resort: trim and return safe token (avoid long sentences)
        const token = s.match(/([A-Za-z0-9\"\/\.\-]+(?:\s*[A-Za-z0-9\"\/\.\-]+)*)/);
        return token ? token[1].trim() : '';
    };
    // Text normalization helpers (accents, dashes, case)
    const stripAccents = (x) => String(x || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    const normText = (x) => stripAccents(x)
        .replace(/[-_]+/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim()
        .toLowerCase();

    // Canonical type and subtype synonym maps
    const TYPE_SYNONYMS = {
        'Aire': ['air', 'filtro de aire', 'motor air filter', 'aire motor'],
        'Cabina': ['cabin', 'cabin air', 'filtro de cabina', 'habitaculo', 'habitáculo'],
        'Fuel': ['fuel', 'combustible', 'fuel filter'],
        'Oil': ['oil', 'aceite', 'oil filter'],
        'Fuel Separator': ['separador de agua', 'water separator', 'coalescer', 'coalescente', 'pre filter', 'pre-filter'],
        'Air Dryer': ['air dryer', 'secador de aire', 'desecante aire', 'air desiccant'],
        'Coolant': ['coolant', 'refrigerante', 'coolant filter'],
        'Hidraulic': ['hydraulic', 'hidraulico', 'hidráulico', 'hidraulica', 'hidráulica'],
        'Turbine Series': ['turbine', 'racor turbine series'],
        'Carcazas': ['housing', 'housings', 'carcaza', 'carcazas']
    };

    const SUBTYPE_SYNONYMS = {
        'Spin-On': ['spin on', 'spin-on', 'spinon', 'roscado', 'enroscable'],
        'Cartridge': ['cartridge', 'elemento', 'cartucho'],
        'Panel': ['panel', 'panel filter'],
        'Axial Seal': ['axial seal', 'sello axial'],
        'Radial Seal': ['radial seal', 'sello radial'],
        'Cylindrical': ['cylindrical', 'cilindrico', 'cilíndrico', 'conico', 'cónico', 'conico/cylindrical'],
        'Primary': ['primary', 'primario'],
        'Secondary': ['secondary', 'secundario'],
        'In-Line': ['in-line', 'inline', 'en linea', 'en línea'],
        'Bypass': ['bypass', 'derivacion', 'derivación'],
        'Full-Flow': ['full flow', 'full-flow', 'flujo total'],
        'High Pressure': ['high pressure', 'alta presion', 'alta presión'],
        'Coalescing': ['coalescing', 'coalescente'],
        'Bowl': ['bowl', 'tazon', 'tazón'],
        'Reusable': ['reusable', 'reutilizable'],
        'Desiccant': ['desiccant', 'desecante'],
        'Standard': ['standard', 'estandar', 'estándar'],
        'High Capacity': ['high capacity', 'alta capacidad'],
        'With Additive/SCA': ['with additive', 'sca', 'con quimica', 'con química'],
        'Blank': ['blank', 'sin quimica', 'sin química'],
        'Suction/In-Tank': ['suction', 'in-tank', 'succion', 'succión', 'sumergido'],
        'Pressure': ['pressure', 'presion', 'presión'],
        'Return': ['return', 'retorno'],
        'Sintered': ['sintered', 'sinterizado']
    };

    const canonicalType = (t) => {
        const s = normText(t);
        if (!s) return '';
        // Exact match to canonical name
        for (const canon of Object.keys(TYPE_SYNONYMS)) {
            if (normText(canon) === s) return canon;
        }
        // Synonym match
        for (const [canon, synonyms] of Object.entries(TYPE_SYNONYMS)) {
            if (synonyms.some(syn => s.includes(normText(syn)))) return canon;
        }
        // Fallback regex checks
        if (/\bcabin\b|cabina/.test(s)) return 'Cabina';
        if (/\bair dryer\b|secador/.test(s)) return 'Air Dryer';
        if (/\bcoolant\b|refrigerante/.test(s)) return 'Coolant';
        if (/hydraulic|hidraulic|hidraulic|hidraul/.test(s)) return 'Hidraulic';
        if (/fuel separator|separador|water separator|coalescer/.test(s)) return 'Fuel Separator';
        if (/\bfuel\b|combustible/.test(s)) return 'Fuel';
        if (/\boil\b|aceite/.test(s)) return 'Oil';
        if (/housing|carcaz/.test(s)) return 'Carcazas';
        if (/turbine/.test(s)) return 'Turbine Series';
        if (/\bair\b|aire/.test(s)) return 'Aire';
        return '';
    };

    const canonicalizeSubtypes = (values) => {
        const input = (Array.isArray(values) ? values : [values])
            .filter(Boolean)
            .map(v => String(v))
            .join(', ');
        const rawTokens = input
            .split(/[,|\/;]+/)
            .map(t => t.trim())
            .filter(Boolean);
        const canonical = new Set();
        for (const tok of rawTokens) {
            const n = normText(tok);
            for (const [canon, syns] of Object.entries(SUBTYPE_SYNONYMS)) {
                if (normText(canon) === n || syns.some(syn => n === normText(syn))) {
                    canonical.add(canon);
                    break;
                }
            }
        }
        return Array.from(canonical);
    };
    // Helper: build subtype descriptor according to canonical type
    const buildSubtypeDescriptor = (canon) => {
        const templates = {
            'Aire': {
                examples: 'Radial Seal (Sello Radial), Axial Seal (Sello Axial), Panel, Cónico/Cylindrical (Cilíndrico), Heavy-Duty',
                desc: 'Se refiere a la forma física del filtro principal y su método de sellado.'
            },
            'Cabina': {
                examples: 'Standard, Carbón Activado (Activated Carbon), Filtro Particulado (Particulate Filter)',
                desc: 'Se refiere al material filtrante utilizado para purificar el aire del habitáculo.'
            },
            'Fuel': {
                examples: 'Spin-On, Cartridge (Elemento), Primary, Secondary, En Línea (In-Line)',
                desc: 'Se refiere al diseño físico o a su posición en el sistema (antes o después de la bomba/inyectores).'
            },
            'Oil': {
                examples: 'Spin-On, Cartridge (Elemento), Bypass, Full-Flow, Alta Presión',
                desc: 'Se refiere al diseño físico y a la ruta del aceite filtrado (flujo total o parcial).'
            },
            'Fuel Separator': {
                examples: 'Pre-Filter, Coalescing (Coalescente), Tazón (Bowl Type), Reusable (Reutilizable)',
                desc: 'Se refiere a su función principal (separar agua del combustible) y su diseño (a menudo usado como Primary).'
            },
            'Air Dryer': {
                examples: 'Cartridge, Desecante (Desiccant), Standard, Alta Capacidad',
                desc: 'Elemento que elimina la humedad del aire comprimido en sistemas de frenos de camiones y maquinaria.'
            },
            'Coolant': {
                examples: 'Con Química (With Additive/SCA), Sin Química (Blank), Spin-On',
                desc: 'Indica si el filtro contiene aditivos (SCA) para proteger el sistema de refrigeración.'
            },
            'Hidraulic': {
                examples: 'Succión/In-Tank (Sumergido), Presión, Retorno (Return), En Línea (In-Line), Sinterizado',
                desc: 'Ubicación en el circuito hidráulico (diferentes puntos de presión y flujo).'
            },
            'Turbine Series': {
                examples: 'Filtro Primario, Filtro Secundario, Coalescer, Separador de Agua',
                desc: 'Términos internos de la marca Racor (Parker) para clasificar elementos de separación de combustible.'
            },
            'Carcazas': {
                examples: 'Simple, Doble, Modular, Tipo T (T-Type), Tipo L (L-Type), Presión Baja/Media/Alta',
                desc: 'Diseño físico del recipiente que alberga el elemento filtrante (donde se instala el filtro).'
            }
        };
        const tpl = templates[canon];
        if (!tpl) return '';
        return `Prefijo (Tipo de Filtro/Componente): ${canon}; Subtipos Comunes (Ejemplos): ${tpl.examples}; Descripción Breve: ${tpl.desc}`;
    };
    // Consider Spanish-labeled fields from web technical sheet
    const funcVal = attrs.funcion || attrs['función'] || attrs.function || '';
    const subtypePrincipal = attrs.subtipo_principal || attrs['subtipo principal'] || '';
    const tipoConstruccion = attrs.tipo_construccion || attrs['tipo de construcción'] || attrs['tipo_de_construcción'] || '';
    const disenoInterno = attrs.diseno_interno || attrs['diseño interno'] || '';

    let typeValue = attrs.type || data.type || data.filter_type || data.family || '';
    if (!typeValue) {
        const f = String(funcVal).toLowerCase();
        if (/separador de agua|water separator/.test(f)) typeValue = 'Fuel Separator';
        else if (/cabina|cabin/.test(f)) typeValue = 'Cabina';
        else if (/aire|air/.test(f)) typeValue = 'Aire';
        else if (/aceite|oil/.test(f)) typeValue = 'Oil';
        else if (/fuel|combustible/.test(f)) typeValue = 'Fuel';
        else if (/hidraulic|hidrául|hydraulic/.test(f)) typeValue = 'Hidraulic';
        else if (/coolant|refrigerante/.test(f)) typeValue = 'Coolant';
        else if (/secador|air dryer/.test(f)) typeValue = 'Air Dryer';
        else if (/carcaza|housing/.test(f)) typeValue = 'Carcazas';
    }

    const typeCanon = canonicalType(typeValue);
    let subtypeDescriptor = buildSubtypeDescriptor(typeCanon) || (attrs.subtype || attrs.style || subtypePrincipal || funcVal || tipoConstruccion || disenoInterno || '');
    // If we have explicit subtype cues, append canonicalized list for visibility
    const explicitSub = [subtypePrincipal, tipoConstruccion, disenoInterno, funcVal]
        .map(v => String(v || '').trim())
        .filter(Boolean);
    const canonicalSubs = canonicalizeSubtypes(explicitSub);
    if (canonicalSubs.length && buildSubtypeDescriptor(typeCanon)) {
        subtypeDescriptor = `${subtypeDescriptor}; Subtipo Detectado: ${canonicalSubs.join(', ')}`;
    }
    // Derivar PREFIJO_FILTRO (familia canónica en código)
    const familyPrefixFromCanon = (canon) => {
        switch (canon) {
            case 'Aire': return 'AIR';
            case 'Cabina': return 'CABIN';
            case 'Fuel': return 'FUEL';
            case 'Oil': return 'OIL';
            case 'Coolant': return 'COOLANT';
            case 'Hidraulic': return 'HYDRAULIC';
            case 'Air Dryer': return 'AIR_DRYER';
            case 'Fuel Separator': return 'FUEL'; // clave compartida
            case 'Turbine Series': return 'TURBINE';
            case 'Carcazas': return 'HOUSING';
            default: return (String(canon || '').toUpperCase() || 'OIL');
        }
    };

    const detectSeriesFromSku = (sku) => {
        const s = String(sku || '').toUpperCase();
        if (s.startsWith('XG')) return 'XG';
        if (s.startsWith('TG')) return 'TG';
        if (s.startsWith('HM')) return 'HM';
        if (s.startsWith('PS')) return 'PS';
        if (s.startsWith('CF')) return 'CF';
        if (s.startsWith('CA')) return 'CA';
        return null;
    };

    const deriveLineSuffix = (familyPrefix, duty, sku) => {
        const media = getProductMedia(familyPrefix, duty || '', sku || '');
        const m = String(media || '').toUpperCase();
        if (m.includes('PRECISION')) return 'PRECISION';
        if (m.includes('INDUSTRIAL')) return 'INDUSTRIAL';
        if (m.includes('SYNTHETIC')) return 'SYNTHETIC';
        if (m.includes('ULTRA')) return 'ULTRA';
        if (m.includes('ADVANCED')) return 'ADVANCED';
        if (m.includes('PREMIUM')) return 'PREMIUM';
        if (m.includes('PURE')) return 'PURE';
        // Reglas por familia si el util devolvió algo genérico
        const series = detectSeriesFromSku(sku);
        if (familyPrefix === 'AIR') return duty === 'HD' ? 'INDUSTRIAL' : 'PRECISION';
        if (familyPrefix === 'CABIN') return series === 'CF' ? 'PREMIUM' : 'PURE';
        if (familyPrefix === 'OIL') return (duty === 'HD' || series === 'XG') ? 'SYNTHETIC' : 'ADVANCED';
        if (familyPrefix === 'FUEL') return (duty === 'HD' || series === 'PS') ? 'ULTRA' : 'ADVANCED';
        if (familyPrefix === 'HYDRAULIC') return 'ULTRA';
        if (familyPrefix === 'COOLANT') return 'SYNTHETIC';
        if (familyPrefix === 'AIR_DRYER') return 'ULTRA';
        if (familyPrefix === 'MARINE') return 'ULTRA';
        return 'ADVANCED';
    };

    const familyPrefix = familyPrefixFromCanon(typeCanon);
    const lineSuffix = deriveLineSuffix(familyPrefix, data.duty, data.sku);
    const mappingKey = `${familyPrefix}_${lineSuffix}`;

    // Media Type (columna I): tecnología base por familia
    const deriveMediaTypeBase = (family) => {
        switch (family) {
            case 'AIR':
                return 'MACROCORE™';
            case 'CABIN':
                return 'MICROKAPPA™';
            // Todas las familias líquidas usan base ELIMTEK™ EXTENDED 99%
            case 'OIL':
            case 'FUEL':
            case 'HYDRAULIC':
            case 'COOLANT':
            case 'FUEL_SEP':
            case 'AIR_DRYER':
            case 'MARINE':
            case 'TURBINE':
                return 'ELIMTEK™ EXTENDED 99%';
            default:
                return 'ELIMTEK™ EXTENDED 99%';
        }
    };
    const mediaTypeBase = deriveMediaTypeBase(familyPrefix);

    // Aplicaciones: derivar categoría general (columna J) y limpiar lista específica (backend y columna K)
    const deriveAplicacionGeneral = (family, duty) => {
        const fam = String(family || '').toUpperCase();
        const d = String(duty || '').toUpperCase();
        if (fam === 'MARINE') return 'Aplicaciones Marinas y Náuticas';
        if (fam === 'AIR_DRYER') return 'Sistemas de Aire Comprimido y Frenos';
        if (fam === 'TURBINE') return 'Turbinas y Generación de Energía';
        if (fam === 'HYDRAULIC') return 'Maquinaria Pesada y Equipos Industriales';
        // Familias líquidas y combustible tienden a HD si duty es HD
        if (d === 'HD') return 'Maquinaria Pesada y Equipos Industriales';
        // LD y cabina/aire tienden a vehículos de pasajeros
        return 'Vehículos de Pasajeros y SUVs';
    };

    const extractAplicacionesEspecificas = (appsInput) => {
        const raw = Array.isArray(appsInput) ? appsInput : (appsInput ? [appsInput] : []);
        const out = [];
        for (const item of raw) {
            if (!item) continue;
            if (typeof item === 'string') {
                const tokens = String(item)
                    .split(/[,;|]+/)
                    .map(s => s.trim())
                    .filter(Boolean);
                for (const t of tokens) out.push(t);
            } else if (typeof item === 'object') {
                const name = String(item.name || '').trim();
                if (name) out.push(name);
            }
        }
        // Deduplicar manteniendo orden de aparición
        const seen = new Set();
        const dedup = [];
        for (const v of out) { if (!seen.has(v)) { seen.add(v); dedup.push(v); } }
        return dedup;
    };

    // Parser detallado de aplicaciones de motor: extrae marca, modelo, años y motor
    const parseYears = (s) => {
        const m = String(s || '').match(/\(([^)]+)\)/);
        if (!m) return '';
        const inside = m[1].trim();
        // Validar que parezca rango o año
        if (/^(?:19|20)[0-9]{2}(?:\s*-\s*(?:19|20)[0-9]{2})?$/.test(inside)) return inside;
        // O combinaciones con comas
        if (/^(?:19|20)[0-9]{2}(?:\s*,\s*(?:19|20)[0-9]{2})+$/.test(inside)) return inside;
        return inside; // si no es perfecto, devolver igualmente
    };
    const parseEngine = (s) => {
        const str = String(s || '');
        // Buscar Motor: ..., Engine: ..., w/ ...
        const motorLabel = str.match(/\b(?:Motor|Engine)\s*:\s*([^\(;,|)]+)/i);
        if (motorLabel) {
            return motorLabel[1].replace(/\s*\([^)]*\)\s*$/, '').trim();
        }
        const withLabel = str.match(/\bw\/\s*([^\(;,|)]+)/i); // w/ ENGINE
        if (withLabel) {
            return withLabel[1].replace(/\s*\([^)]*\)\s*$/, '').trim();
        }
        // Buscar desplazamiento tipo "1.7L" o códigos tipo D722
        const disp = str.match(/\b([0-9]+(?:\.[0-9]+)?\s*L)\b/i);
        if (disp) return disp[1].trim();
        const code = str.match(/\b([A-Z]{1,3}[0-9]{2,4}[A-Z]?)\b/);
        if (code) return code[1].trim();
        // Buscar HP
        const hp = str.match(/\b([0-9]{2,3})\s*hp\b/i);
        if (hp) return `${hp[1]} hp`;
        return '';
    };
    const splitBrandModel = (name) => {
        const n = String(name || '').trim();
        if (!n) return { brand: '', model: '' };
        // Remover paréntesis y etiquetas de motor para aislar marca + modelo
        let base = n
            .replace(/\([^)]*\)/g, ' ')
            .replace(/\b(?:Motor|Engine)\s*:[^;,.|)]+/ig, ' ')
            .replace(/\bw\/\s*[^;,.|)]+/ig, ' ')
            .replace(/\b[0-9]+(?:\.[0-9]+)?\s*L\b/ig, ' ');
        base = base.replace(/[.,;:]+\s*$/g, ' ');
        const parts = base.trim().replace(/\s{2,}/g, ' ').split(' ');
        const brand = (parts[0] || '').toUpperCase();
        const model = parts.slice(1).join(' ').trim();
        return { brand, model };
    };
    const isEspecial = (engineStr) => /\bhp\b/i.test(String(engineStr || ''));
    const isPassengerBrand = (brand) => {
        const b = String(brand || '').toUpperCase();
        const LD_BRANDS = [
            'HONDA','TOYOTA','FORD','CHEVROLET','NISSAN','KIA','HYUNDAI','MAZDA','VOLKSWAGEN','VW','AUDI','BMW','MERCEDES','RENAULT','PEUGEOT','CITROEN','SEAT','FIAT','SUZUKI','SUBARU'
        ];
        return LD_BRANDS.includes(b);
    };

    const buildMotorApplications = (appsInput, dutyMode) => {
        const raw = Array.isArray(appsInput) ? appsInput : (appsInput ? [appsInput] : []);
        const entries = [];
        for (const item of raw) {
            const s = typeof item === 'string' ? item : (item && item.name ? item.name : '');
            if (!s) continue;
            const years = parseYears(s);
            const eng = parseEngine(s);
            const { brand, model } = splitBrandModel(s);
            const especial = isEspecial(eng);
            const category = especial ? 'Especial' : (String(dutyMode || '').toUpperCase() === 'HD' ? 'HD' : 'LD');
            entries.push({ brand, model, years, engine: eng, category, raw: s });
        }
        // Dedup por combinación (brand+model+engine+years)
        const seen = new Set();
        const out = [];
        for (const e of entries) {
            const key = `${e.brand}|${e.model}|${e.engine}|${e.years}`;
            if (!seen.has(key)) { seen.add(key); out.push(e); }
        }
        return out;
    };
    const formatMotorEntry = (e) => {
        if (e.category === 'LD') {
            return `${e.brand} ${e.model}${e.years ? ` (${e.years})` : ''}${e.engine ? ` Motor: ${e.engine}` : ''}`.trim();
        }
        if (e.category === 'HD' || e.category === 'Especial') {
            return `${e.brand} ${e.model}${e.engine ? ` Motor: ${e.engine}` : ''}${e.years ? ` (${e.years})` : ''}`.trim();
        }
        return `${e.brand} ${e.model}`.trim();
    };
    const buildMotorFinalAndIndex = (appsInput, dutyMode) => {
        const entries = buildMotorApplications(appsInput, dutyMode);
        const finalList = entries.map(formatMotorEntry).filter(Boolean).slice(0, 10);
        // Índice: incluir brand+model, engine y years como tokens
        const indexTokens = [];
        for (const e of entries) {
            const bm = `${e.brand} ${e.model}`.trim();
            if (bm) indexTokens.push(bm);
            if (e.engine) indexTokens.push(String(e.engine).trim());
            if (e.years) indexTokens.push(String(e.years).trim());
        }
        const idx = Array.from(new Set(indexTokens.filter(Boolean)));
        return { finalList, indexArray: idx, entries };
    };

    // Descripción scrapeada y fallback
    const scrapedDescription = attrs.description || attrs.type || '';
    const isGeneric = (
        !scrapedDescription ||
        String(scrapedDescription).length < 50 ||
        STOP_WORDS.some(w => String(scrapedDescription).toUpperCase().includes(w))
    );
    const finalDescription = (isGeneric && DESCRIPCIONES_ELIMFILTERS[mappingKey])
        ? ensureBrandPhrasing(DESCRIPCIONES_ELIMFILTERS[mappingKey])
        : scrapedDescription;

    // OEM Codes: limpieza y bifurcación
    const BRAND_BLOCKLIST = [
        /\bFRAM\b/i, /\bWIX\b/i, /\bBALDWIN\b/i, /\bFLEETGUARD\b/i, /\bAC\s?DELCO\b/i, /\bPUROLATOR\b/i,
        /\bMANN\b/i, /\bHENGST\b/i, /\bMAHLE\b/i, /\bBOSCH\b/i, /\bK&N\b/i, /\bK\s?&\s?N\b/i,
        /\bMOTORCRAFT\b/i, /\bRYCO\b/i, /\bRACOR\b/i, /\bPARKER\b/i, /\bDONALDSON\b/i,
        /^(PH|TG|XG|HM|CA|CF|PS|G)[0-9]+$/i,
        /^(LF|FF|AF|HF|WF)[0-9]+$/i,
        /^(BF|PF|RS|HP|CA|PA)[0-9]+$/i,
        /^FL[-]?[0-9]+$/i,
        /^(L|PL|PBL)[0-9]+$/i,
        /^KN[-]?[0-9]+$/i,
        /^P[0-9]{4,}$/i
    ];
    const isCompetitorCode = (code) => BRAND_BLOCKLIST.some(rx => rx.test(code));
    // Clasificación de CR (Aftermarket) por prefijos comunes de marcas de filtros de repuesto
    const AFTERMARKET_PREFIXES = [
        /^(P)[0-9]{4,}$/i,               // Donaldson P series
        /^(LF|FF|AF|HF|WF)[0-9]+$/i,    // Fleetguard series
        /^(BF|PF|RS|HP|CA|PA)[0-9]+$/i, // Baldwin series
        /^FL[-]?[0-9]+$/i,              // Motorcraft FL-
        /^KN[-]?[0-9]+$/i,              // K&N
        /^(PH|TG|XG|HM|CA|CF|PS|G)[0-9]+$/i, // FRAM series
        /^(WL|WP|WA|WF)[0-9]+$/i,       // WIX patterns
        /^(C|W|HU|PU|WK)[0-9]{3,}$/i    // MANN/MAHLE style
    ];
    const isAftermarketCR = (code) => AFTERMARKET_PREFIXES.some(rx => rx.test(code));
    const isLikelyOemPattern = (code) => {
        const c = code.toUpperCase();
        if (/^[A-Z0-9]{3,}-[A-Z0-9-]{2,}$/.test(c)) return true;
        if (/^[A-Z]{2,4}[0-9]{3,}$/.test(c)) return true;
        if (/^[0-9]{4,}-[A-Z0-9]{2,}$/.test(c)) return true;
        if (/^[A-Z0-9]{6,}$/.test(c) && /[A-Z]/.test(c) && /[0-9]/.test(c)) return true;
        return false;
    };
    const normalizeCode = (code) => String(code || '').trim().toUpperCase().replace(/\s+/g, '');
    const splitCodes = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        return String(val).split(/[,;|\s]+/).filter(Boolean);
    };
    const cleanOemCodes = (input) => {
        const raw = splitCodes(input);
        const cleaned = [];
        for (const r of raw) {
            const n = normalizeCode(r);
            if (!n || n.length < 4) continue;
            if (isCompetitorCode(n)) continue;
            if (!isLikelyOemPattern(n)) continue;
            cleaned.push(n);
        }
        return Array.from(new Set(cleaned));
    };
    // Recopilar fuentes de códigos
    const rawOem = Array.isArray(data.oem_codes) ? data.oem_codes : (data.oem_codes ? [data.oem_codes] : (data.code_oem ? [data.code_oem] : []));
    const rawCR = Array.isArray(data.cross_reference) ? data.cross_reference : (data.cross_reference ? [data.cross_reference] : []);

    // Limpiar y clasificar CR visibles
    const cleanedCR = Array.from(new Set(
        rawCR
            .flatMap(v => String(v || '').split(/[;,\s]+/))
            .map(normalizeCode)
            .filter(Boolean)
            .filter(c => isAftermarketCR(c))
    ));
    const crVisualStr = cleanedCR.slice(0, 8).join(', ');

    // Limpiar y clasificar OEM genuinos
    const cleanedOem = cleanOemCodes(rawOem);

    // Índice backend: incluye TODOS los códigos (CR + OEM), deduplicados
    const oemIndexAll = Array.from(new Set([...cleanedOem, ...cleanedCR]));

    // Calidad de altura: validar coherencia básica según familia y subtipo/duty
    const heightVal = parseFloat(
        normalizeMM(
            attrs.height_mm ||
            attrs.height ||
            attrs.length ||
            attrs.overall_height ||
            attrs.total_length ||
            attrs['overall height'] ||
            attrs['total length'] ||
            ''
        ) || ''
    );
    const odVal = parseFloat(
        normalizeMM(
            attrs.outer_diameter_mm ||
            attrs.outer_diameter ||
            attrs.major_diameter ||
            attrs['outer diameter'] ||
            attrs['major diameter'] ||
            attrs.od ||
            attrs['od'] ||
            ''
        ) || ''
    );
    const isSpinOnDesign = /spin[- ]?on|roscado|enroscable/i.test(String(subtypeDescriptor || ''));
    const isSpinOnOil = (familyPrefix === 'OIL') && isSpinOnDesign;
    // Micron rating extraction: capture first numeric value associated to µm/um/micron
    const normalizeMicronToUm = (raw) => {
        let s = String(raw || '').trim();
        if (!s) return NaN;
        s = s.replace(/μ/g, 'µ');
        // Common forms: "99% @ 20µ", "20 µm", "4um", "25 microns"
        let m = s.match(/@\s*([0-9]+(?:\.[0-9]+)?)\s*µm?/i);
        if (!m) m = s.match(/([0-9]+(?:\.[0-9]+)?)\s*µm?/i);
        if (!m) m = s.match(/([0-9]+(?:\.[0-9]+)?)\s*um\b/i);
        if (!m) m = s.match(/([0-9]+(?:\.[0-9]+)?)\s*micron(?:s)?\b/i);
        const val = m ? parseFloat(m[1]) : NaN;
        return isNaN(val) ? NaN : val;
    };
    // Normalize minimum operating temperature to Celsius
    const normalizeTempMinC = (raw) => {
        let s = String(raw || '').trim();
        if (!s) return NaN;
        s = s.replace(/[°º]/g, '');
        const lower = s.toLowerCase();
        // Extract first numeric token
        const mNum = lower.match(/-?\d+(?:\.\d+)?/);
        if (!mNum) return NaN;
        const val = parseFloat(mNum[0]);
        const isF = /f(ahrenheit)?\b/.test(lower) || /\bf\b/.test(lower) || /\bdeg f\b/.test(lower);
        const isC = /c(elsius)?\b/.test(lower) || /\bc\b/.test(lower) || /\bdeg c\b/.test(lower);
        if (isF && !isNaN(val)) {
            return ((val - 32) * 5) / 9;
        }
        // Default: assume Celsius if unit not specified
        return isNaN(val) ? NaN : val;
    };
    // Normalize maximum operating temperature to Celsius
    const normalizeTempMaxC = (raw) => {
        let s = String(raw || '').trim();
        if (!s) return NaN;
        s = s.replace(/[°º]/g, '');
        const lower = s.toLowerCase();
        const mNum = lower.match(/-?\d+(?:\.\d+)?/);
        if (!mNum) return NaN;
        const val = parseFloat(mNum[0]);
        const isF = /f(ahrenheit)?\b/.test(lower) || /\bf\b/.test(lower) || /\bdeg f\b/.test(lower);
        if (isF && !isNaN(val)) {
            return ((val - 32) * 5) / 9;
        }
        return isNaN(val) ? NaN : val;
    };
    // Extract thread major diameter in mm for QA comparisons
    const extractThreadMajorDiameterMM = (rawThread) => {
        const s = String(rawThread || '').trim();
        if (!s) return NaN;
        // Metric: M20 x 1.5 -> 20 mm
        const mMetric = s.match(/\bM\s*(\d+(?:\.\d+)?)\s*[xX]/);
        if (mMetric) return parseFloat(mMetric[1]);
        // Explicit mm within thread string
        const mMM = s.match(/(\d+(?:\.\d+)?)\s*mm\b/i);
        if (mMM) return parseFloat(mMM[1]);
        // Inch fraction: 3/4"-16 UNF or 3/4-16
        const mFrac = s.match(/(\d+)\s*\/\s*(\d+)\s*(?:"|in|inch)?/i);
        if (mFrac) {
            const num = parseFloat(mFrac[1]);
            const den = parseFloat(mFrac[2]);
            if (den) return (num / den) * 25.4;
        }
        // Decimal inch: 0.75 in
        const mIn = s.match(/(\d+(?:\.\d+)?)\s*(?:"|in|inch)\b/i);
        if (mIn) return parseFloat(mIn[1]) * 25.4;
        // Fallback: look for a leading number before dash (e.g., 3/4-16 or 1-12)
        const mLead = s.match(/^(\d+(?:\.\d+)?)\s*-/);
        if (mLead) {
            const valIn = parseFloat(mLead[1]);
            // If value looks like inches (<= 2.5 typical), convert
            if (!isNaN(valIn)) return valIn * 25.4;
        }
        return NaN;
    };
    // Normalize fluid compatibility to controlled list (Spanish labels)
    const normalizeFluidCompatibility = (rawList) => {
        const CONTROLLED = [
            'Aceite de Motor',
            'Diésel',
            'Gasolina',
            'ATF (Fluido de Transmisión)',
            'Líquido Hidráulico (HV/HL)',
            'Refrigerante (Glicol/Agua)'
        ];
        const mapToken = (t) => {
            const s = String(t || '').trim();
            if (!s) return '';
            const lower = s.toLowerCase();
            // Remove redundant phrases
            const cleaned = lower
                .replace(/compatible con|apto para|adequado para|adequate for|suitable for|for use with/g, '')
                .replace(/todos los|all|full|100%/g, '')
                .replace(/aceites sintéticos|synthetic oils|synthetic/g, 'motor oil')
                .replace(/biodi[eé]sel/g, 'diesel')
                .replace(/petrol/g, 'gasoline')
                .replace(/antifreeze|glycol/g, 'coolant')
                .trim();
            // Mapping
            if (/\b(engine|motor)\s*oil\b|\baceite\b/.test(cleaned)) return 'Aceite de Motor';
            if (/\bdiesel\b|\bgaso[ó]leo\b/.test(cleaned)) return 'Diésel';
            if (/\bgasoline\b|\bgas\b|\bpetrol\b|\bgasolina\b/.test(cleaned)) return 'Gasolina';
            if (/\batf\b|transmission\s*fluid|fluido de transmisi[óo]n/.test(cleaned)) return 'ATF (Fluido de Transmisión)';
            if (/hydraulic\s*(fluid|oil)|l[ií]quido hidr[aá]ulico|\bhv\b|\bhl\b/.test(cleaned)) return 'Líquido Hidráulico (HV/HL)';
            if (/coolant|refrigerante|glycol|glicol|agua/.test(cleaned)) return 'Refrigerante (Glicol/Agua)';
            return '';
        };
        const sources = Array.isArray(rawList) ? rawList : [rawList];
        const inputText = sources
            .filter(Boolean)
            .map(v => String(v))
            .join(', ');
        const tokens = inputText
            .split(/[,;\/|]|\s+y\s+|\s+and\s+/i)
            .map(t => t.trim())
            .filter(Boolean);
        const set = new Set();
        for (const tk of tokens) {
            const mapped = mapToken(tk);
            if (mapped) set.add(mapped);
        }
        // Enforce controlled list order
        const arr = CONTROLLED.filter(v => set.has(v));
        const str = arr.join(', ');
        return { arr, str };
    };
    const heightQualityFlag = (() => {
        if (isNaN(heightVal)) return '';
        if (isSpinOnOil && (heightVal < 70 || heightVal > 200)) {
            return '⚠️ Altura fuera de rango típico para filtro de aceite Spin-On (70–200 mm).';
        }
        if (familyPrefix === 'AIR' && String(data.duty || '').toUpperCase() === 'HD' && heightVal < 150) {
            return '⚠️ Altura inusualmente baja para elemento de aire Heavy Duty (>150 mm recomendado).';
        }
        return '';
    })();
    const outerDiameterQualityFlag = (() => {
        if (isNaN(odVal)) return '';
        if (isSpinOnOil && (odVal < 70 || odVal > 100)) {
            return '⚠️ Diámetro exterior fuera de rango típico para filtro de aceite Spin-On (70–100 mm).';
        }
        if (familyPrefix === 'AIR' && String(data.duty || '').toUpperCase() === 'HD' && odVal < 120) {
            return '⚠️ Diámetro exterior inusualmente bajo para elemento de aire Heavy Duty (>120 mm recomendado).';
        }
        return '';
    })();
    const micronVal = normalizeMicronToUm(
        attrs.micron_rating ||
        attrs.media_micron ||
        attrs.nominal_micron ||
        attrs.beta_rating ||
        finalDescription ||
        data.description ||
        attrs.description ||
        ''
    );
    const tempMinCVal = normalizeTempMinC(
        attrs.operating_temperature_min_c ||
        attrs.operating_temperature_min ||
        attrs.operating_temp_min ||
        attrs.cold_start_temp ||
        attrs['operating temperature min'] ||
        attrs.operating_temperature_min_f ||
        finalDescription ||
        ''
    );
    const tempMaxCVal = normalizeTempMaxC(
        attrs.operating_temperature_max_c ||
        attrs.operating_temperature_max ||
        attrs.operating_temp_max ||
        attrs.max_temperature ||
        attrs['operating temperature max'] ||
        attrs.operating_temperature_max_f ||
        finalDescription ||
        ''
    );
    const tempMinQualityFlag = (() => {
        if (isNaN(tempMinCVal)) return '';
        if (tempMinCVal >= 0) return '⚠️ Temperatura mínima debe ser negativa (valor en °C).';
        // General recommended band: -10°C to -50°C
        if (tempMinCVal > -10) return '⚠️ Mínima inusualmente alta (se espera ≤ -10°C).';
        if (tempMinCVal < -50) return '⚠️ Mínima inusualmente baja (se espera ≥ -50°C).';
        // Tech coherence: ELIMTEK SYNTHETIC or ULTRA usually ≤ -30°C
        const desc = String(finalDescription || '').toUpperCase();
        const techSynthetic = desc.includes('ELIMTEK™ SYNTHETIC');
        const techUltra = desc.includes('ELIMTEK™ ULTRA');
        if ((techSynthetic || techUltra) && tempMinCVal > -30) {
            return '⚠️ Mínima alta para tecnología ELIMTEK™ (esperado ≤ -30°C).';
        }
        return '';
    })();
    const tempMaxQualityFlag = (() => {
        if (isNaN(tempMaxCVal)) return '';
        if (tempMaxCVal <= 0) return '⚠️ Temperatura máxima debe ser positiva (valor en °C).';
        // Typical band: 90°C – 170°C
        if (tempMaxCVal < 90) return '⚠️ Máxima inusualmente baja (se espera ≥ 90°C).';
        if (tempMaxCVal > 170) return '⚠️ Máxima inusualmente alta (se espera ≤ 170°C).';
        const desc = String(finalDescription || '').toUpperCase();
        const techSynthetic = desc.includes('ELIMTEK™ SYNTHETIC');
        const hasSilicone = /silicona|silicone/i.test(String(attrs.seal_material || ''));
        if ((techSynthetic || hasSilicone) && tempMaxCVal < 130) {
            return '⚠️ Máxima baja para medio sintético/sellos de silicona (esperado ≥ 130°C).';
        }
        if (familyPrefix === 'OIL' && tempMaxCVal < 120) {
            return '⚠️ Máxima baja para familia OIL (esperado ≥ 120°C).';
        }
        if ((familyPrefix === 'AIR' || familyPrefix === 'CABIN') && tempMaxCVal > 130) {
            return '⚠️ Máxima inusualmente alta para AIR/CABIN (revisar coherencia).';
        }
        return '';
    })();
    // Fluid compatibility
    const rawFluidCompat = (
        attrs.fluid_compatibility ||
        attrs.suitable_for ||
        attrs['suitable for'] ||
        attrs.fluid_type ||
        attrs['fluid type'] ||
        attrs.chemical_compatibility ||
        attrs['chemical compatibility'] ||
        ''
    );
    const { arr: fluidCompatArr, str: fluidCompatStr } = normalizeFluidCompatibility([
        rawFluidCompat,
        finalDescription
    ]);
    const fluidCompatQualityFlag = (() => {
        if (!fluidCompatArr.length) {
            // AIR/CABIN can be empty
            if (familyPrefix === 'AIR' || familyPrefix === 'CABIN') return '';
            return '⚠️ Compatibilidad de fluidos vacía; verificar fuente.';
        }
        if (familyPrefix === 'OIL' && !fluidCompatArr.includes('Aceite de Motor')) {
            return '⚠️ Falta "Aceite de Motor" para familia OIL.';
        }
        if (familyPrefix === 'FUEL' && !(fluidCompatArr.includes('Diésel') || fluidCompatArr.includes('Gasolina'))) {
            return '⚠️ FUEL debe incluir "Diésel" o "Gasolina".';
        }
        const descUp = String(finalDescription || '').toUpperCase();
        const isTransmission = /TRANSMISSION|ATF/.test(descUp);
        if (isTransmission && !fluidCompatArr.includes('ATF (Fluido de Transmisión)')) {
            return '⚠️ Falta ATF para filtro de transmisión.';
        }
        if ((familyPrefix === 'AIR' || familyPrefix === 'CABIN') && fluidCompatArr.some(v => v !== '')) {
            // If we ever map a liquid for AIR/CABIN, warn
            const liquids = ['Aceite de Motor','Diésel','Gasolina','ATF (Fluido de Transmisión)','Líquido Hidráulico (HV/HL)','Refrigerante (Glicol/Agua)'];
            if (fluidCompatArr.some(v => liquids.includes(v))) return '⚠️ Incompatible: AIR/CABIN no lleva líquidos.';
        }
        return '';
    })();
    // Disposal method normalization
    const normalizeDisposalMethod = (raw, family) => {
        const input = String(raw || '').toLowerCase();
        const hazardousHints = /(hazardous|peligroso|hazmat|aceite usado|used oil|diesel|fuel|coolant|hydraulic|glycol)/i;
        const nonHazardHints = /(non[- ]?hazardous|no peligroso|general waste|reciclable|recyclable|common)/i;
        if (hazardousHints.test(input)) return 'Residuo Peligroso (Gestión Controlada)';
        if (nonHazardHints.test(input)) return 'Residuo No Peligroso (Reciclable/Común)';
        // Fallback by family prefix
        const liquidFamilies = new Set(['OIL','FUEL','HYDRAULIC','COOLANT']);
        if (liquidFamilies.has(family)) return 'Residuo Peligroso (Gestión Controlada)';
        if (family === 'AIR' || family === 'CABIN') return 'Residuo No Peligroso (Reciclable/Común)';
        // Default conservative
        return 'Residuo Peligroso (Gestión Controlada)';
    };
    const rawDisposal = (
        attrs.disposal_method ||
        attrs.disposal ||
        attrs.waste_class ||
        attrs['waste class'] ||
        attrs.environmental_note ||
        attrs['environmental note'] ||
        ''
    );
    const disposalMethodStr = normalizeDisposalMethod(`${rawDisposal} ${finalDescription || ''}`, familyPrefix);
    const disposalQualityFlag = (() => {
        // Coherence checks
        const isNonHaz = /No Peligroso/i.test(disposalMethodStr);
        const isHaz = /Peligroso/i.test(disposalMethodStr) && !isNonHaz;
        if ((familyPrefix === 'AIR' || familyPrefix === 'CABIN') && isHaz) {
            return '⚠️ AIR/CABIN no debería ser Residuo Peligroso.';
        }
        const liquidFamilies = new Set(['OIL','FUEL','HYDRAULIC','COOLANT']);
        if (liquidFamilies.has(familyPrefix) && isNonHaz) {
            return '⚠️ Líquidos deben ser Residuo Peligroso (Gestión Controlada).';
        }
        return '';
    })();

    return {
        query_norm: data.query_normalized || data.code_input || '',
        sku: data.sku || '',
        duty: data.duty || '',
        type: typeValue,
        subtype: subtypeDescriptor,
        description: finalDescription,
        oem_codes: cleanedOem.slice(0, 8).join(', '),
        oem_codes_indice_mongo: oemIndexAll,
        cross_reference: crVisualStr,
        media_type: mediaTypeBase,
        equipment_applications: deriveAplicacionGeneral(familyPrefix, data.duty || ''),
        // Columna K visible: APLICACION_MOTOR_FINAL (conciso y validado)
        engine_applications: buildMotorFinalAndIndex(data.engine_applications || data.applications || [], data.duty || '').finalList.join(', '),
        aplicacion_motor_warning: (() => {
            try {
                const { entries } = buildMotorFinalAndIndex(data.engine_applications || data.applications || [], data.duty || '');
                const hasLDBrand = entries.some(e => isPassengerBrand(e.brand));
                const isHDProduct = String(data.duty || '').toUpperCase() === 'HD' || ['OIL','FUEL','HYDRAULIC'].includes(familyPrefix);
                const HEAVY_CR = [/^(P)[0-9]{4,}$/i, /^(LF|FF|AF|HF|WF)[0-9]+$/i, /^(BF|PF|RS|HP|CA|PA)[0-9]+$/i];
                const heavyCRFound = cleanedCR.some(c => HEAVY_CR.some(rx => rx.test(c)));
                if (isHDProduct && heavyCRFound && hasLDBrand) {
                    return '⚠️ Posible incoherencia: Producto HD con aplicaciones de LD detectadas.';
                }
                return '';
            } catch (_) { return ''; }
        })(),
        // Backend: índice completo de modelos/motores/años
        aplicacion_motor_indice: buildMotorFinalAndIndex(data.engine_applications || data.applications || [], data.duty || '').indexArray,
        aplicacion_especifica_hd_indice_mongo: extractAplicacionesEspecificas(data.engine_applications || data.applications || []),
        height_mm: normalizeMM(
            attrs.height_mm ||
            attrs.height ||
            attrs.length ||
            attrs.overall_height ||
            attrs.total_length ||
            attrs['overall height'] ||
            attrs['total length'] ||
            ''
        ),
        outer_diameter_mm: normalizeMM(
            attrs.outer_diameter_mm ||
            attrs.outer_diameter ||
            attrs.major_diameter ||
            attrs['outer diameter'] ||
            attrs['major diameter'] ||
            attrs.od ||
            attrs['od'] ||
            ''
        ),
        micron_rating: (isNaN(micronVal) ? '' : `${micronVal} µm`),
        operating_temperature_min_c: (isNaN(tempMinCVal) ? '' : Number(tempMinCVal.toFixed(1))),
        operating_temperature_max_c: (isNaN(tempMaxCVal) ? '' : Number(tempMaxCVal.toFixed(1))),
        fluid_compatibility: fluidCompatStr,
        disposal_method: disposalMethodStr,
        gasket_od_mm: (() => {
            // Only relevant for spin-on in liquid families
            const liquidFamilies = new Set(['OIL','FUEL','HYDRAULIC','COOLANT']);
            if (!liquidFamilies.has(familyPrefix)) return '';
            if (!isSpinOnDesign) return '';
            const valStr = normalizeMM(
                attrs.gasket_od_mm ||
                attrs.gasket_od ||
                attrs['gasket od'] ||
                attrs.seal_od ||
                attrs['seal od'] ||
                attrs.gasket_outer_diameter ||
                attrs['gasket outer diameter'] ||
                attrs.diametro_exterior_junta ||
                attrs['diámetro exterior junta'] ||
                attrs['diámetro exterior de junta'] ||
                ''
            );
            const val = parseFloat(valStr || '');
            return isNaN(val) ? '' : Number(val.toFixed(2));
        })(),
        thread_size: (() => {
            const rawThread = (
                attrs.thread_size ||
                attrs.thread ||
                attrs['thread size'] ||
                attrs.tpi ||
                attrs.threads_per_inch ||
                attrs.rosca ||
                attrs.roscado ||
                ''
            );
            const norm = normalizeThreadSize(rawThread);
            // Validation of prefix/design: only Spin-On liquid families should have thread_size
            const liquidFamilies = new Set(['OIL','FUEL','COOLANT','HYDRAULIC']);
            if (!liquidFamilies.has(familyPrefix)) return '';
            if (familyPrefix === 'AIR' || familyPrefix === 'CABIN') return '';
            // If we lack explicit spin-on, accept when source provides a thread value
            if (!isSpinOnDesign && !norm) return '';
            return norm;
        })(),
        fluid_compatibility_indice_mongo: (fluidCompatArr.length ? fluidCompatArr : undefined),
        fluid_compatibility_quality_flag: fluidCompatQualityFlag,
        disposal_method_indice_mongo: disposalMethodStr || undefined,
        disposal_method_quality_flag: disposalQualityFlag,
        gasket_id_mm: (() => {
            const liquidFamilies = new Set(['OIL','FUEL','HYDRAULIC','COOLANT']);
            if (!liquidFamilies.has(familyPrefix)) return '';
            if (!isSpinOnDesign) return '';
            const valStr = normalizeMM(
                attrs.gasket_id_mm ||
                attrs.gasket_id ||
                attrs['gasket id'] ||
                attrs.seal_id ||
                attrs['seal id'] ||
                attrs.gasket_inner_diameter ||
                attrs['gasket inner diameter'] ||
                attrs.diametro_interior_junta ||
                attrs['diámetro interior junta'] ||
                attrs['diámetro interior de junta'] ||
                ''
            );
            const val = parseFloat(valStr || '');
            return isNaN(val) ? '' : Number(val.toFixed(2));
        })(),
        bypass_valve_psi: (() => {
            // Only meaningful for Spin-On Full-Flow in liquid families OIL/FUEL
            const liquidFamilies = new Set(['OIL','FUEL','HYDRAULIC','COOLANT']);
            const isFullFlow = /full[- ]?flow|flujo total/i.test(String(subtypeDescriptor || ''));
            if (!liquidFamilies.has(familyPrefix)) return '';
            if (!isSpinOnDesign) return '';
            // For HYDRAULIC/COOLANT spin-ons, bypass may be design-specific; keep optional
            if ((familyPrefix === 'OIL' || familyPrefix === 'FUEL') && !isFullFlow) return '';
            const raw = (
                attrs.bypass_valve_psi ||
                attrs.bypass_valve_setting ||
                attrs.relief_valve_pressure ||
                attrs.relief_pressure ||
                attrs.presion_derivacion ||
                attrs['presión de derivación'] ||
                attrs['presion de derivacion'] ||
                ''
            );
            const val = normalizePressureToPsi(raw);
            return isNaN(val) ? '' : Number(val.toFixed(1));
        })(),
        beta_200: (() => {
            // Solo aplica a filtros de fase líquida OIL/FUEL/HYDRAULIC
            const applicable = new Set(['OIL','FUEL','HYDRAULIC']);
            if (!applicable.has(familyPrefix)) return '';
            const raw = (
                attrs.beta_200 ||
                attrs.beta_ratio ||
                attrs.beta_value ||
                attrs['beta 200'] ||
                attrs['beta200'] ||
                attrs['β200'] ||
                attrs.beta ||
                ''
            );
            const val = normalizeBetaRatio(raw);
            return isNaN(val) || val <= 0 ? '' : Number(val);
        })(),
        hydrostatic_burst_psi: (() => {
            const applicable = new Set(['OIL','FUEL','HYDRAULIC']);
            if (!applicable.has(familyPrefix)) return '';
            const raw = (
                attrs.hydrostatic_burst_psi ||
                attrs.burst_pressure ||
                attrs.maximum_structural_strength ||
                attrs.structural_strength ||
                attrs['presión de estallido'] ||
                attrs['presion de estallido'] ||
                ''
            );
            const val = normalizePressureToPsi(raw);
            return isNaN(val) || val <= 0 ? '' : Math.round(val);
        })(),
        dirt_capacity_grams: attrs.dirt_capacity_grams || '',
        rated_flow_gpm: attrs.rated_flow_gpm || '',
        rated_flow_cfm: attrs.rated_flow_cfm || '',
        operating_pressure_min_psi: attrs.operating_pressure_min_psi || '',
        operating_pressure_max_psi: attrs.operating_pressure_max_psi || '',
        weight_grams: attrs.weight_grams || '',
        panel_width_mm: (() => {
            const applicable = new Set(['AIR','CABIN']);
            if (!applicable.has(familyPrefix)) return '';
            const isPanelDesign = /panel/i.test(String(subtypeDescriptor || ''));
            if (!isPanelDesign) return '';
            const raw = (
                attrs.panel_width_mm ||
                attrs.width ||
                attrs.panel_width ||
                attrs.secondary_dimension ||
                attrs['Width'] ||
                attrs['Panel Width'] ||
                attrs['Secondary Dimension'] ||
                attrs['Ancho'] ||
                attrs['Anchura'] ||
                ''
            );
            const norm = normalizeMM(raw);
            if (!norm) return '';
            const num = parseFloat(norm);
            return isNaN(num) ? '' : Number(num.toFixed(2));
        })(),
        panel_depth_mm: (() => {
            const applicable = new Set(['AIR','CABIN']);
            if (!applicable.has(familyPrefix)) return '';
            const isPanelDesign = /panel/i.test(String(subtypeDescriptor || ''));
            if (!isPanelDesign) return '';
            const raw = (
                attrs.panel_depth_mm ||
                attrs.depth ||
                attrs.thickness ||
                attrs.height || // cuando se refiere a panel
                attrs['Depth'] ||
                attrs['Thickness'] ||
                attrs['Panel Height'] ||
                attrs['Altura del Panel'] ||
                attrs['Grosor'] ||
                ''
            );
            const norm = normalizeMM(raw);
            if (!norm) return '';
            const num = parseFloat(norm);
            return isNaN(num) ? '' : Number(num.toFixed(2));
        })(),
        water_separation_efficiency_percent: (() => {
            // Solo para FUEL; preferente cuando diseño es Separator
            if (familyPrefix !== 'FUEL') return '';
            const isSeparator = /separator|separador|separación/i.test(String(subtypeDescriptor || ''));
            const raw = (
                attrs.water_separation_efficiency_percent ||
                attrs.water_separation_efficiency ||
                attrs.wse ||
                attrs['Water Separation Efficiency'] ||
                attrs['WSE'] ||
                attrs['Rendimiento de Separación de H2O'] ||
                attrs['Eficiencia de Separación de Agua'] ||
                ''
            );
            const s = String(raw).trim();
            if (!s) return isSeparator ? '' : '';
            const lower = s.toLowerCase().replace(/,/g, '.');
            const m = lower.match(/([0-9]+(?:\.[0-9]+)?)/);
            if (!m) return '';
            const n = parseFloat(m[1]);
            if (isNaN(n)) return '';
            // clamp básica a [0, 100]
            const val = Math.max(0, Math.min(100, n));
            return Number(val.toFixed(1));
        })(),
        drain_type: attrs.drain_type || '',
        inner_diameter_mm: (() => {
            const subtypeRaw = String((attrs.subtype || data.subtype || '')).trim().toLowerCase();
            const isSpinOn = /\bspin\s*-?on\b|\broscado\b|\benroscado\b|\benroscable\b/i.test(subtypeRaw);
            const isPanel = /\bpanel\b/i.test(subtypeRaw);
            const isCartridge = /\b(cartridge|elemento|cartucho)\b/i.test(subtypeRaw);
            const isRadialSeal = /\bradial\s*seal\b|\bsello\s*radial\b/i.test(subtypeRaw);

            // Vacío para Spin-On y Panel
            if (isSpinOn || isPanel) return '';

            // Extracción dirigida
            const raw = (
                attrs.inner_diameter_mm ||
                attrs.inner_diameter ||
                attrs['Inner Diameter'] ||
                attrs['I.D.'] ||
                attrs.ID ||
                attrs['Minor Diameter'] ||
                attrs.minor_diameter ||
                attrs['Diámetro interior'] ||
                attrs['Diámetro menor'] ||
                ''
            );
            const mm = normalizeMM(raw);
            if (!mm) return isCartridge || isRadialSeal ? '' : '';
            const n = parseFloat(mm);
            return Number.isFinite(n) ? Number(n.toFixed(2)) : '';
        })(),
        pleat_count: (() => {
            const subtypeRaw = String((attrs.subtype || data.subtype || '')).trim().toLowerCase();
            const isSpinOn = /\bspin\s*-?on\b|\broscado\b|\benroscado\b|\benroscable\b/.test(subtypeRaw);
            const isPanel = /\bpanel\b/.test(subtypeRaw);
            const isCartridge = /\b(cartridge|elemento|cartucho)\b/.test(subtypeRaw);
            const isRadialSeal = /\bradial\s*seal\b|\bsello\s*radial\b/.test(subtypeRaw);

            if (isSpinOn) return '';
            const raw = (
                attrs.pleat_count ||
                attrs['Pleat Count'] ||
                attrs['Number of Pleats'] ||
                attrs['Cantidad de Pliegues'] ||
                ''
            );
            const s = String(raw).trim();
            if (!s) return (isPanel || isCartridge || isRadialSeal) ? '' : '';
            const m = s.match(/(\d{1,5})/);
            if (!m) return '';
            const n = parseInt(m[1], 10);
            return Number.isFinite(n) ? n : '';
        })(),
        seal_material: (() => {
            const subtypeRaw = String((attrs.subtype || data.subtype || '')).trim().toLowerCase();
            const isSpinOn = /\bspin\s*-?on\b|\broscado\b|\benroscado\b|\benroscable\b/.test(subtypeRaw);
            const isSeparator = /\bseparator\b|\bseparador\b/.test(subtypeRaw);
            const isRadialSeal = /\bradial\s*seal\b|\bsello\s*radial\b/.test(subtypeRaw);
            const isPanel = /\bpanel\b/.test(subtypeRaw);
            const isCabin = /\bcabin\b|\bcabina\b/.test(subtypeRaw);

            const raw = (
                attrs.seal_material ||
                attrs['Seal Material'] ||
                attrs['Gasket Material'] ||
                attrs['Seal Composition'] ||
                attrs['Material de la Junta'] ||
                attrs['Material del Sello'] ||
                ''
            );
            const s = String(raw).trim().toLowerCase();
            const mapSeal = (t) => {
                if (!t) return '';
                if (/(nitrile|nitrilo|buna\s*-?n|nbr|buna)/i.test(t)) return 'Nitrilo (NBR) / Buna-N';
                if (/(silicone|silicona|vmq)/i.test(t)) return 'Silicona (VMQ)';
                if (/(viton|fkm|fluorocarbon|fluoro\s*elastomer|fluoroelast[oó]mero)/i.test(t)) return 'Fluorocarbono (Viton / FKM)';
                if (/(acrylic|acr[ií]lico|acm)/i.test(t)) return 'Acrílico (ACM)';
                if (/(epdm|ethylene[- ]propylene|etileno[- ]propileno)/i.test(t)) return 'Etileno-Propileno (EPDM)';
                return '';
            };
            const normalized = mapSeal(s);
            if (isPanel || isCabin) return ''; // Panel/Cabina: debe ser vacío
            return normalized;
        })(),
        housing_material: (() => {
            const raw = (
                attrs.housing_material ||
                attrs['Housing Material'] ||
                attrs['Body Composition'] ||
                attrs['Material de Envoltura'] ||
                attrs['Material de la Carcasa'] ||
                ''
            );
            const s = String(raw).trim().toLowerCase();
            const mapHousing = (t) => {
                if (!t) return '';
                if (/(stainless\s*steel|inox|inoxidabl[e]?|ss\s*(304|316)?)/i.test(t)) return 'Acero Inoxidable (Stainless Steel)';
                if (/(steel|acero)(?!\s*inox)/i.test(t) || /(galvanizado|carbon\s*steel)/i.test(t)) return 'Acero (Steel)';
                if (/(alumin[ií]o|aluminum)/i.test(t)) return 'Aluminio (Aluminum)';
                if (/(nylon|polymer|pl[aá]stico|polyamide|pa\s*66|composite)/i.test(t)) return 'Nylon/Plástico Reforzado (Polymer/Nylon)';
                if (/(fiberglass|fibra\s*de\s*vidrio|frp)/i.test(t)) return 'Fibra de Vidrio Reforzada (Fiberglass Reinforced)';
                return '';
            };
            return mapHousing(s);
        })(),
        iso_main_efficiency_percent: (() => {
            const typeRaw = String((data.type || attrs.type || '')).trim().toLowerCase();
            const isAir = /\bair\b|\baire\b/.test(typeRaw);
            const isCabin = /\bcabin\b|\bcabina\b/.test(typeRaw);
            if (isAir || isCabin) return '';

            const candidates = [
                attrs.iso_main_efficiency_percent,
                attrs['ISO Efficiency'],
                attrs['Multi-Pass Efficiency'],
                attrs['Multi Pass Efficiency'],
                attrs['βx Efficiency'],
                attrs['Beta Efficiency'],
                attrs['Efficiency @ 10 µm'],
                attrs['Efficiency @ 20 µm'],
                attrs['Efficiency at 10 micron'],
                attrs['Efficiency at 20 micron'],
                attrs['Eficiencia ISO'],
                attrs['Eficiencia Multi-Pass'],
                attrs.description,
                data.description
            ].filter(Boolean);

            const parseEff = (v) => {
                const s = String(v || '').toLowerCase();
                if (!s) return null;
                const pm = s.match(/(\d+(?:\.\d+)?)\s*%/);
                const percent = pm ? parseFloat(pm[1]) : (() => {
                    const n = s.match(/(\d+(?:\.\d+)?)/);
                    return n ? parseFloat(n[1]) : NaN;
                })();
                const mm = s.match(/(\d+(?:\.\d+)?)\s*(µm|um|micron|microns|micr[oó]n|micr[oó]metro|micr[oó]metros)/i);
                const micron = mm ? parseFloat(mm[1]) : NaN;
                if (isNaN(percent)) return null;
                return { percent, micron: isNaN(micron) ? undefined : micron };
            };

            const parsed = candidates.map(parseEff).filter(Boolean);
            if (!parsed.length) return '';
            // Prefer with micron 20 or 10, otherwise highest percent
            const withMicron = parsed.filter(p => typeof p.micron !== 'undefined');
            let chosen;
            if (withMicron.length) {
                const preferred = withMicron.filter(p => p.micron === 20 || p.micron === 10);
                if (preferred.length) {
                    chosen = preferred.sort((a,b) => b.percent - a.percent)[0];
                } else {
                    chosen = withMicron.sort((a,b) => b.percent - a.percent)[0];
                }
            } else {
                chosen = parsed.sort((a,b) => b.percent - a.percent)[0];
            }
            if (!chosen || isNaN(chosen.percent)) return '';
            return String(Number(chosen.percent.toFixed(1))); // solo número, sin "%"
        })(),
        iso_test_method: (() => {
            const typeRaw = String((data.type || attrs.type || '')).trim().toLowerCase();
            const isAir = /\bair\b|\baire\b/.test(typeRaw);
            const isCabin = /\bcabin\b|\bcabina\b/.test(typeRaw);
            if (isAir || isCabin) return '';

            const candidates = [
                attrs.iso_test_method,
                attrs['ISO Test Method'],
                attrs['Test Standard'],
                attrs['Certification'],
                attrs['ISO Standard'],
                attrs['Método de Prueba ISO'],
                attrs['Norma ISO'],
                attrs['Estándar ISO'],
                attrs.description,
                data.description
            ].filter(Boolean);

            const normalize = (v) => {
                const s = String(v || '').toLowerCase();
                if (!s) return '';
                if (/iso\s*16889/i.test(s)) return 'ISO 16889';
                if (/iso\s*4548\s*-?\s*12/i.test(s) || /iso\s*4548\s*(part|parte)\s*12/i.test(s)) return 'ISO 4548-12';
                if (/iso\s*19438/i.test(s)) return 'ISO 19438';
                return '';
            };
            for (const cand of candidates) {
                const n = normalize(cand);
                if (n) return n;
            }
            return '';
        })(),
        manufacturing_standards: (() => {
            const candidates = [
                attrs.manufacturing_standards,
                attrs.certification_standards,
                attrs.certifications,
                attrs['Quality Standards'],
                attrs['Certifications'],
                attrs['Normas de Producción'],
                attrs['Quality Management'],
                attrs.description,
                data.description
            ].filter(Boolean);
            const normalizeAll = (text) => {
                const s = String(text || '');
                const found = new Set();
                if (/iatf\s*-?\s*16949/i.test(s)) found.add('IATF 16949');
                if (/iso\s*-?\s*9001/i.test(s)) found.add('ISO 9001');
                if (/iso\s*-?\s*14001/i.test(s)) found.add('ISO 14001');
                if (/iso\s*-?\s*45001/i.test(s)) found.add('ISO 45001');
                return Array.from(found);
            };
            const all = Array.from(new Set(candidates.flatMap(normalizeAll)));
            if (!all.length) return '';
            const ORDER = ['ISO 9001','IATF 16949','ISO 14001','ISO 45001'];
            const sorted = all.sort((a,b) => ORDER.indexOf(a) - ORDER.indexOf(b));
            return sorted.join(', ');
        })(),
        certification_standards: (() => {
            const candidates = [
                attrs.certification_standards,
                attrs.homologation,
                attrs['Homologation'],
                attrs['Product Approval'],
                attrs['Compliance'],
                attrs['Aprobación de Producto'],
                attrs['Conformidad'],
                attrs.description,
                data.description
            ].filter(Boolean);
            const extract = (text) => {
                const s = String(text || '');
                const out = new Set();
                if (/(?:\bCE\b|conformidad\s*europea|conformité\s*européenne)/i.test(s)) out.add('CE');
                if (/(?:\bECE\b|reglamento\s*ece|un\s*e\s*ce)/i.test(s)) out.add('ECE');
                if (/\bSAE\b/i.test(s)) out.add('SAE');
                if (/\bAPI\b/i.test(s)) out.add('API');
                if (/\bASTM\b/i.test(s)) out.add('ASTM');
                return Array.from(out);
            };
            const all = Array.from(new Set(candidates.flatMap(extract)));
            if (!all.length) return '';
            const ORDER = ['CE','ECE','SAE','API','ASTM'];
            const sorted = all.sort((a,b) => ORDER.indexOf(a) - ORDER.indexOf(b));
            return sorted.join(', ');
        })(),
        service_life_hours: attrs.service_life_hours || '',
        change_interval_km: attrs.change_interval_km || '',
        // Backend-only helpers for search/quality
        height_mm_indice_mongo: isNaN(heightVal) ? undefined : heightVal,
        height_quality_flag: heightQualityFlag,
        outer_diameter_mm_indice_mongo: isNaN(odVal) ? undefined : odVal,
        outer_diameter_quality_flag: outerDiameterQualityFlag,
        certification_standards_indice_mongo: (() => {
            const texts = [
                attrs.certification_standards,
                attrs.homologation,
                attrs['Homologation'],
                attrs['Product Approval'],
                attrs['Compliance'],
                attrs['Aprobación de Producto'],
                attrs['Conformidad'],
                attrs.description,
                data.description
            ].filter(Boolean);
            const extract = (text) => {
                const s = String(text || '');
                const out = [];
                if (/(?:\bCE\b|conformidad\s*europea|conformité\s*européenne)/i.test(s)) out.push('CE');
                if (/(?:\bECE\b|reglamento\s*ece|un\s*e\s*ce)/i.test(s)) out.push('ECE');
                if (/\bSAE\b/i.test(s)) out.push('SAE');
                if (/\bAPI\b/i.test(s)) out.push('API');
                if (/\bASTM\b/i.test(s)) out.push('ASTM');
                return out;
            };
            const set = new Set(texts.flatMap(extract));
            return set.size ? Array.from(set) : undefined;
        })(),
        certification_standards_quality_flag: (() => {
            const brandStr = String(data.manufactured_by || attrs.manufactured_by || '').toUpperCase();
            const combined = [
                attrs.certification_standards,
                attrs.homologation,
                attrs['Homologation'],
                attrs['Product Approval'],
                attrs['Compliance'],
                attrs['Aprobación de Producto'],
                attrs['Conformidad'],
                attrs.description,
                data.description
            ].filter(Boolean).join(' | ');
            if (/iso\s*-?\s*9001|iatf\s*-?\s*16949/i.test(combined)) {
                return '⚠️ Evitar duplicación: ISO 9001/IATF 16949 pertenecen a AO (gestión de calidad).';
            }
            const isElimfilters = /ELIMFILTERS/.test(brandStr) || /ELIMTEK/.test(String(combined));
            const hasProductCert = /(\bCE\b|\bECE\b|\bSAE\b|\bAPI\b|\bASTM\b)/i.test(combined);
            if (isElimfilters && !hasProductCert) {
                return '⚠️ ELIMFILTERS: se recomienda declarar homologaciones de producto (CE/SAE/ECE/API/ASTM).';
            }
            return '';
        })(),
        // AQ — Service Life (hours)
        service_life_hours: (() => {
            const sources = [
                attrs.service_life_hours,
                attrs['Service Life'],
                attrs['Service Interval'],
                attrs['Intervalo de Servicio'],
                attrs['Filter Life'],
                attrs['Horas de Operación'],
                attrs['Horas de Operación Recomendadas'],
                attrs['Operating Hours'],
                attrs['Recommended Operating Hours'],
                attrs.description,
                data.description
            ].filter(Boolean);

            const pickNumericMax = (text) => {
                const s = String(text || '');
                // Capture ranges like 500-750 h or 500–750 hrs, or single values with units
                const rangeMatch = s.match(/(\d{2,5}[\.,]?\d*)\s*[–-]\s*(\d{2,5}[\.,]?\d*)\s*(h(?:ours)?|hrs?|horas|mile?s?|km)/i);
                if (rangeMatch) {
                    return { value: parseFloat(rangeMatch[2].replace(',', '.')), unit: rangeMatch[3].toLowerCase() };
                }
                const singleMatch = s.match(/(\d{2,6}[\.,]?\d*)\s*(h(?:ours)?|hrs?|horas|mile?s?|km)/i);
                if (singleMatch) {
                    return { value: parseFloat(singleMatch[1].replace(',', '.')), unit: singleMatch[2].toLowerCase() };
                }
                return null;
            };

            const duty = String(attrs.duty || data.duty || '').toUpperCase();
            const type = String(attrs.type || data.type || '').toLowerCase();
            const avgSpeeds = {
                hd: { mph: 20, kmh: 32 },
                ld: { mph: 35, kmh: 56 }
            };
            const speeds = /HD/.test(duty) ? avgSpeeds.hd : avgSpeeds.ld;

            for (const src of sources) {
                const info = pickNumericMax(src);
                if (!info) continue;
                let hours;
                if (/^h|hrs|hours|horas$/.test(info.unit)) {
                    hours = info.value;
                } else if (/mile/.test(info.unit)) {
                    hours = info.value / (speeds.mph || 30);
                } else if (/km/.test(info.unit)) {
                    hours = info.value / (speeds.kmh || 50);
                }
                if (hours && isFinite(hours)) {
                    return Math.round(hours);
                }
            }
            return '';
        })(),
        service_life_hours_indice_mongo: (() => {
            const val = Number.isFinite(Number(attrs.service_life_hours)) ? Number(attrs.service_life_hours) : undefined;
            const computed = (() => {
                const h = (typeof buildRowDataCached === 'function' ? undefined : undefined);
                return undefined; // avoid reference; we'll mirror service_life_hours below
            })();
            // Mirror from calculated field above using same logic to ensure index exists
            const sources = [
                attrs.service_life_hours,
                attrs['Service Life'],
                attrs['Service Interval'],
                attrs['Intervalo de Servicio'],
                attrs['Filter Life'],
                attrs['Horas de Operación'],
                attrs['Horas de Operación Recomendadas'],
                attrs['Operating Hours'],
                attrs['Recommended Operating Hours'],
                attrs.description,
                data.description
            ].filter(Boolean);
            const pick = (text) => {
                const s = String(text || '');
                const rangeMatch = s.match(/(\d{2,5}[\.,]?\d*)\s*[–-]\s*(\d{2,5}[\.,]?\d*)\s*(h(?:ours)?|hrs?|horas|mile?s?|km)/i);
                if (rangeMatch) return { value: parseFloat(rangeMatch[2].replace(',', '.')), unit: rangeMatch[3].toLowerCase() };
                const singleMatch = s.match(/(\d{2,6}[\.,]?\d*)\s*(h(?:ours)?|hrs?|horas|mile?s?|km)/i);
                if (singleMatch) return { value: parseFloat(singleMatch[1].replace(',', '.')), unit: singleMatch[2].toLowerCase() };
                return null;
            };
            const duty = String(attrs.duty || data.duty || '').toUpperCase();
            const avgSpeeds = { hd: { mph: 20, kmh: 32 }, ld: { mph: 35, kmh: 56 } };
            const speeds = /HD/.test(duty) ? avgSpeeds.hd : avgSpeeds.ld;
            for (const src of sources) {
                const info = pick(src);
                if (!info) continue;
                let hours;
                if (/^h|hrs|hours|horas$/.test(info.unit)) hours = info.value;
                else if (/mile/.test(info.unit)) hours = info.value / (speeds.mph || 30);
                else if (/km/.test(info.unit)) hours = info.value / (speeds.kmh || 50);
                if (hours && isFinite(hours)) return Math.round(hours);
            }
            return undefined;
        })(),
        service_life_hours_quality_flag: (() => {
            const duty = String(attrs.duty || data.duty || '').toUpperCase();
            const combined = [
                attrs.service_life_hours,
                attrs['Service Life'],
                attrs['Service Interval'],
                attrs['Intervalo de Servicio'],
                attrs['Filter Life'],
                attrs['Horas de Operación'],
                attrs['Horas de Operación Recomendadas'],
                attrs['Operating Hours'],
                attrs['Recommended Operating Hours'],
                attrs.description,
                data.description
            ].filter(Boolean).join(' | ');
            const unitMilesOrKm = /(mile|km)/i.test(combined);
            const val = (() => {
                const m = combined.match(/(\d{2,6})\s*(h(?:ours)?|hrs?|horas)/i);
                return m ? parseInt(m[1], 10) : undefined;
            })();
            const calcPresent = /(\d{2,6})\s*(mile?s?|km)/i.test(combined);
            if (unitMilesOrKm && !val) {
                return '⚠️ Fuente en millas/km: conversión heurística a horas aplicada; verificar con fabricante.';
            }
            const hours = (() => {
                const h = String((typeof service_life_hours !== 'undefined' ? service_life_hours : '')).trim();
                return h ? parseInt(h, 10) : undefined;
            })();
            if (/HD/.test(duty) && Number.isFinite(hours)) {
                if (hours < 250 || hours > 1000) {
                    return '⚠️ HD: fuera de rango típico (250–1000 h). Ajuste según aplicación.';
                }
            }
            return '';
        })(),
        // AQ display with unit (horas)
        service_life_hours_display: (() => {
            const sources = [
                attrs.service_life_hours,
                attrs['Service Life'],
                attrs['Service Interval'],
                attrs['Intervalo de Servicio'],
                attrs['Filter Life'],
                attrs['Horas de Operación'],
                attrs['Horas de Operación Recomendadas'],
                attrs['Operating Hours'],
                attrs['Recommended Operating Hours'],
                attrs.description,
                data.description
            ].filter(Boolean);
            const pick = (text) => {
                const s = String(text || '');
                const rangeMatch = s.match(/(\d{2,5}[\.,]?\d*)\s*[–-]\s*(\d{2,5}[\.,]?\d*)\s*(h(?:ours)?|hrs?|horas|mile?s?|km)/i);
                if (rangeMatch) return { value: parseFloat(rangeMatch[2].replace(',', '.')), unit: rangeMatch[3].toLowerCase() };
                const singleMatch = s.match(/(\d{2,6}[\.,]?\d*)\s*(h(?:ours)?|hrs?|horas|mile?s?|km)/i);
                if (singleMatch) return { value: parseFloat(singleMatch[1].replace(',', '.')), unit: singleMatch[2].toLowerCase() };
                return null;
            };
            const duty = String(attrs.duty || data.duty || '').toUpperCase();
            const avgSpeeds = { hd: { mph: 20, kmh: 32 }, ld: { mph: 35, kmh: 56 } };
            const speeds = /HD/.test(duty) ? avgSpeeds.hd : avgSpeeds.ld;
            for (const src of sources) {
                const info = pick(src);
                if (!info) continue;
                let hours;
                if (/^h|hrs|hours|horas$/.test(info.unit)) hours = info.value;
                else if (/mile/.test(info.unit)) hours = info.value / (speeds.mph || 30);
                else if (/km/.test(info.unit)) hours = info.value / (speeds.kmh || 50);
                if (hours && isFinite(hours)) return `${Math.round(hours)} horas`;
            }
            return '';
        })(),
        // AR — Change Interval (kilometers)
        change_interval_km: (() => {
            const sources = [
                attrs.change_interval_km,
                attrs['Change Interval'],
                attrs['Intervalo de Reemplazo'],
                attrs['Recommended Mileage'],
                attrs['Recommended Km'],
                attrs.description,
                data.description
            ].filter(Boolean);
            const pickNumericMax = (text) => {
                const s = String(text || '');
                const cleanInt = (numStr) => {
                    const digits = (numStr || '').replace(/[^\d]/g, '');
                    return digits ? parseInt(digits, 10) : NaN;
                };
                const rangeMatch = s.match(/(\d[\d.,]*)\s*[–-]\s*(\d[\d.,]*)\s*(km|kilometros|kilometers|mile?s?)/i);
                if (rangeMatch) {
                    return { value: cleanInt(rangeMatch[2]), unit: rangeMatch[3].toLowerCase() };
                }
                const singleMatch = s.match(/(\d[\d.,]*)\s*(km|kilometros|kilometers|mile?s?)/i);
                if (singleMatch) {
                    return { value: cleanInt(singleMatch[1]), unit: singleMatch[2].toLowerCase() };
                }
                return null;
            };
            for (const src of sources) {
                const info = pickNumericMax(src);
                if (!info) continue;
                let km;
                if (/^km|kilometros|kilometers$/.test(info.unit)) {
                    km = info.value;
                } else if (/mile/.test(info.unit)) {
                    km = info.value * 1.60934;
                }
                if (km && isFinite(km)) {
                    return Math.round(km);
                }
            }
            return '';
        })(),
        change_interval_km_indice_mongo: (() => {
            const sources = [
                attrs.change_interval_km,
                attrs['Change Interval'],
                attrs['Intervalo de Reemplazo'],
                attrs['Recommended Mileage'],
                attrs['Recommended Km'],
                attrs.description,
                data.description
            ].filter(Boolean);
            const pick = (text) => {
                const s = String(text || '');
                const cleanInt = (numStr) => {
                    const digits = (numStr || '').replace(/[^\d]/g, '');
                    return digits ? parseInt(digits, 10) : NaN;
                };
                const rangeMatch = s.match(/(\d[\d.,]*)\s*[–-]\s*(\d[\d.,]*)\s*(km|kilometros|kilometers|mile?s?)/i);
                if (rangeMatch) return { value: cleanInt(rangeMatch[2]), unit: rangeMatch[3].toLowerCase() };
                const singleMatch = s.match(/(\d[\d.,]*)\s*(km|kilometros|kilometers|mile?s?)/i);
                if (singleMatch) return { value: cleanInt(singleMatch[1]), unit: singleMatch[2].toLowerCase() };
                return null;
            };
            for (const src of sources) {
                const info = pick(src);
                if (!info) continue;
                let km;
                if (/^km|kilometros|kilometers$/.test(info.unit)) km = info.value;
                else if (/mile/.test(info.unit)) km = info.value * 1.60934;
                if (km && isFinite(km)) return Math.round(km);
            }
            return undefined;
        })(),
        change_interval_km_quality_flag: (() => {
            const duty = String(attrs.duty || data.duty || '').toUpperCase();
            const combined = [
                attrs.change_interval_km,
                attrs['Change Interval'],
                attrs['Intervalo de Reemplazo'],
                attrs['Recommended Mileage'],
                attrs['Recommended Km'],
                attrs.description,
                data.description
            ].filter(Boolean).join(' | ');
            const hasMiles = /(mile)s?/i.test(combined);
            const kmVal = (() => {
                const m = combined.match(/(\d{2,7})\s*(km|kilometros|kilometers)/i);
                return m ? parseInt(m[1], 10) : undefined;
            })();
            const kmCalcPresent = /(\d{2,7})\s*mile/i.test(combined);
            const computedKm = (() => {
                const cleanInt = (numStr) => {
                    const digits = (numStr || '').replace(/[^\d]/g, '');
                    return digits ? parseInt(digits, 10) : NaN;
                };
                const kmCandidate = [
                    attrs.change_interval_km,
                    attrs['Change Interval'],
                    attrs['Intervalo de Reemplazo'],
                    attrs['Recommended Mileage'],
                    attrs['Recommended Km']
                ].filter(Boolean).map(String).map(s => {
                    const mKm = s.match(/(\d[\d.,]*)\s*(km|kilometros|kilometers)/i);
                    if (mKm) return cleanInt(mKm[1]);
                    const mMi = s.match(/(\d[\d.,]*)\s*mile/i);
                    if (mMi) return Math.round(cleanInt(mMi[1]) * 1.60934);
                    return undefined;
                }).find(v => Number.isFinite(v));
                return kmCandidate;
            })();
            // LD: obligatorio
            if (/LD/.test(duty)) {
                if (!Number.isFinite(computedKm)) {
                    return '⚠️ LD: Intervalo de cambio en km es obligatorio.';
                }
            }
            // HD: coherencia con horas si ambos presentes
            const serviceHours = (() => {
                const s = [
                    attrs.service_life_hours,
                    attrs['Service Life'],
                    attrs['Service Interval'],
                    attrs['Intervalo de Servicio'],
                    attrs['Filter Life'],
                    attrs['Horas de Operación'],
                    attrs['Horas de Operación Recomendadas'],
                    attrs['Operating Hours'],
                    attrs['Recommended Operating Hours']
                ].filter(Boolean).join(' | ');
                const m = s.match(/(\d{2,6})\s*(h(?:ours)?|hrs?|horas)/i);
                return m ? parseInt(m[1], 10) : undefined;
            })();
            if (/HD/.test(duty) && Number.isFinite(serviceHours) && Number.isFinite(computedKm)) {
                const speeds = { kmh: 32 };
                const hoursFromKm = computedKm / speeds.kmh;
                const delta = Math.abs(hoursFromKm - serviceHours) / Math.max(hoursFromKm, serviceHours);
                if (delta > 0.3) {
                    return '⚠️ HD: revisar coherencia entre km y horas (±30%).';
                }
            }
            // Rango típico (Oil LD/HD): 10k–50k km
            if (Number.isFinite(computedKm)) {
                if (computedKm < 10000 || computedKm > 50000) {
                    return '⚠️ Fuera de rango típico (10,000–50,000 km). Ajuste según aplicación.';
                }
            }
            // Conversión miles
            if (kmCalcPresent && !kmVal) {
                return '⚠️ Fuente en millas: conversión obligatoria aplicada (1 mi ≈ 1.60934 km).';
            }
            return '';
        })(),
        // AR display with unit (km/miles)
        change_interval_km_display: (() => {
            const sources = [
                attrs.change_interval_km,
                attrs['Change Interval'],
                attrs['Intervalo de Reemplazo'],
                attrs['Recommended Mileage'],
                attrs['Recommended Km'],
                attrs.description,
                data.description
            ].filter(Boolean);
            const pickFirst = (text) => {
                const s = String(text || '');
                const mKm = s.match(/(\d[\d.,]*)\s*(km|kilometros|kilometers)/i);
                if (mKm) {
                    const n = (mKm[1] || '').replace(/[^\d]/g, '');
                    const val = n ? parseInt(n, 10) : NaN;
                    if (Number.isFinite(val)) return `${val} km`;
                }
                const mMi = s.match(/(\d[\d.,]*)\s*mile/i);
                if (mMi) {
                    const n = (mMi[1] || '').replace(/[^\d]/g, '');
                    const val = n ? parseInt(n, 10) : NaN;
                    if (Number.isFinite(val)) return `${val} miles`;
                }
                return null;
            };
            for (const src of sources) {
                const disp = pickFirst(src);
                if (disp) return disp;
            }
            // fallback: if normalized exists, show km
            const km = (typeof change_interval_km !== 'undefined' ? change_interval_km : undefined);
            if (Number.isFinite(km)) return `${km} km`;
            return '';
        })(),
        manufacturing_standards_indice_mongo: (() => {
            const texts = [
                attrs.manufacturing_standards,
                attrs.certification_standards,
                attrs.certifications,
                attrs['Quality Standards'],
                attrs['Certifications'],
                attrs['Normas de Producción'],
                attrs['Quality Management'],
                attrs.description,
                data.description
            ].filter(Boolean);
            const collect = (text) => {
                const s = String(text || '');
                const out = [];
                if (/iatf\s*-?\s*16949/i.test(s)) out.push('IATF 16949');
                if (/iso\s*-?\s*9001/i.test(s)) out.push('ISO 9001');
                if (/iso\s*-?\s*14001/i.test(s)) out.push('ISO 14001');
                if (/iso\s*-?\s*45001/i.test(s)) out.push('ISO 45001');
                return out;
            };
            const set = new Set(texts.flatMap(collect));
            return set.size ? Array.from(set) : undefined;
        })(),
        manufacturing_standards_quality_flag: (() => {
            const brandStr = String(data.manufactured_by || attrs.manufactured_by || '').toUpperCase();
            const desc = String(attrs.description || data.description || '');
            const isElimfilters = /ELIMFILTERS/.test(brandStr) || /ELIMTEK/.test(desc);
            if (!isElimfilters) return '';
            const arr = (() => {
                const text = [
                    attrs.manufacturing_standards,
                    attrs.certification_standards,
                    attrs.certifications,
                    attrs['Quality Standards'],
                    attrs['Certifications'],
                    attrs['Normas de Producción'],
                    attrs['Quality Management'],
                    attrs.description,
                    data.description
                ].filter(Boolean).join(' | ');
                const out = new Set();
                if (/iatf\s*-?\s*16949/i.test(text)) out.add('IATF 16949');
                if (/iso\s*-?\s*9001/i.test(text)) out.add('ISO 9001');
                if (/iso\s*-?\s*14001/i.test(text)) out.add('ISO 14001');
                if (/iso\s*-?\s*45001/i.test(text)) out.add('ISO 45001');
                return Array.from(out);
            })();
            const required = ['ISO 9001','IATF 16949','ISO 14001'];
            const missing = required.filter(r => !arr.includes(r));
            if (missing.length) {
                return `⚠️ ELIMFILTERS: faltan certificaciones requeridas: ${missing.join(', ')}.`;
            }
            return '';
        })(),
        iso_test_method_indice_mongo: (() => {
            const typeRaw = String((data.type || attrs.type || '')).trim().toLowerCase();
            const isAir = /\bair\b|\baire\b/.test(typeRaw);
            const isCabin = /\bcabin\b|\bcabina\b/.test(typeRaw);
            if (isAir || isCabin) return undefined;
            const rawList = [
                attrs.iso_test_method,
                attrs['ISO Test Method'],
                attrs['Test Standard'],
                attrs['Certification'],
                attrs['ISO Standard'],
                attrs['Método de Prueba ISO'],
                attrs['Norma ISO'],
                attrs['Estándar ISO'],
                attrs.description,
                data.description
            ].filter(Boolean);
            const normalize = (v) => {
                const s = String(v || '').toLowerCase();
                if (/iso\s*16889/i.test(s)) return 'ISO 16889';
                if (/iso\s*4548\s*-?\s*12/i.test(s) || /iso\s*4548\s*(part|parte)\s*12/i.test(s)) return 'ISO 4548-12';
                if (/iso\s*19438/i.test(s)) return 'ISO 19438';
                return undefined;
            };
            for (const cand of rawList) {
                const n = normalize(cand);
                if (n) return n;
            }
            return undefined;
        })(),
        iso_test_method_quality_flag: (() => {
            const typeRaw = String((data.type || attrs.type || '')).trim().toLowerCase();
            const isOil = /\boil\b|\baceite\b/.test(typeRaw);
            const isHydraulic = /\bhydraulic\b|\bhidr[aá]ulic[oa]\b/.test(typeRaw);
            const isFuel = /\bfuel\b|\bcombustible\b|\bdi[eé]sel|gasolina/.test(typeRaw);
            const isAir = /\bair\b|\baire\b/.test(typeRaw);
            const isCabin = /\bcabin\b|\bcabina\b/.test(typeRaw);

            const rawMethod = [
                attrs.iso_test_method,
                attrs['ISO Test Method'],
                attrs['Test Standard'],
                attrs['Certification'],
                attrs['ISO Standard'],
                attrs['Método de Prueba ISO'],
                attrs['Norma ISO'],
                attrs['Estándar ISO'],
                attrs.description,
                data.description
            ].find(Boolean) || '';
            const norm = (() => {
                const s = String(rawMethod).toLowerCase();
                if (/iso\s*16889/i.test(s)) return 'ISO 16889';
                if (/iso\s*4548\s*-?\s*12/i.test(s) || /iso\s*4548\s*(part|parte)\s*12/i.test(s)) return 'ISO 4548-12';
                if (/iso\s*19438/i.test(s)) return 'ISO 19438';
                return '';
            })();

            const betaRaw = String(
                (attrs.beta_200 || attrs['β200'] || '')
            ).toLowerCase();
            const hasBeta = /\d/.test(betaRaw);
            const isoEffStr = String(
                (attrs.iso_main_efficiency_percent || attrs['ISO Efficiency'] || '')
            );
            const hasIsoEff = /\d/.test(isoEffStr);

            if ((isOil || isHydraulic || isFuel) && (hasBeta || hasIsoEff) && !norm) {
                return '⚠️ Falta Método de Prueba ISO (AN) para filtro líquido con Beta/Eficiencia.';
            }
            if ((isAir || isCabin) && norm) {
                return '⚠️ Air/Cabin: el método ISO debe ser vacío; usan SAE/ASHRAE.';
            }
            if (hasBeta && norm && !/ISO\s*(16889|4548-12)/i.test(norm)) {
                return '⚠️ Beta presente: se espera norma de Pasadas Múltiples (ISO 16889 o ISO 4548-12).';
            }
            return '';
        })(),
        iso_main_efficiency_percent_indice_mongo: (() => {
            const typeRaw = String((data.type || attrs.type || '')).trim().toLowerCase();
            const isAir = /\bair\b|\baire\b/.test(typeRaw);
            const isCabin = /\bcabin\b|\bcabina\b/.test(typeRaw);
            if (isAir || isCabin) return undefined;
            const candidates = [
                attrs.iso_main_efficiency_percent,
                attrs['ISO Efficiency'],
                attrs['Multi-Pass Efficiency'],
                attrs['Multi Pass Efficiency'],
                attrs['βx Efficiency'],
                attrs['Beta Efficiency'],
                attrs['Efficiency @ 10 µm'],
                attrs['Efficiency @ 20 µm'],
                attrs['Efficiency at 10 micron'],
                attrs['Efficiency at 20 micron'],
                attrs['Eficiencia ISO'],
                attrs['Eficiencia Multi-Pass'],
                attrs.description,
                data.description
            ].filter(Boolean);
            const parseEff = (v) => {
                const s = String(v || '').toLowerCase();
                if (!s) return null;
                const pm = s.match(/(\d+(?:\.\d+)?)\s*%/);
                const percent = pm ? parseFloat(pm[1]) : (() => {
                    const n = s.match(/(\d+(?:\.\d+)?)/);
                    return n ? parseFloat(n[1]) : NaN;
                })();
                const mm = s.match(/(\d+(?:\.\d+)?)\s*(µm|um|micron|microns|micr[oó]n|micr[oó]metro|micr[oó]metros)/i);
                const micron = mm ? parseFloat(mm[1]) : NaN;
                if (isNaN(percent)) return null;
                return { percent, micron: isNaN(micron) ? undefined : micron };
            };
            const parsed = candidates.map(parseEff).filter(Boolean);
            if (!parsed.length) return undefined;
            const withMicron = parsed.filter(p => typeof p.micron !== 'undefined');
            let chosen;
            if (withMicron.length) {
                const preferred = withMicron.filter(p => p.micron === 20 || p.micron === 10);
                chosen = (preferred.length ? preferred : withMicron).sort((a,b) => b.percent - a.percent)[0];
            } else {
                chosen = parsed.sort((a,b) => b.percent - a.percent)[0];
            }
            return (chosen && !isNaN(chosen.percent)) ? chosen.percent : undefined;
        })(),
        iso_main_efficiency_quality_flag: (() => {
            const typeRaw = String((data.type || attrs.type || '')).trim().toLowerCase();
            const isOil = /\boil\b|\baceite\b/.test(typeRaw);
            const isHydraulic = /\bhydraulic\b|\bhidr[aá]ulic[oa]\b/.test(typeRaw);
            const isAir = /\bair\b|\baire\b/.test(typeRaw);
            const isCabin = /\bcabin\b|\bcabina\b/.test(typeRaw);
            const valStr = String(
                (attrs.iso_main_efficiency_percent ||
                 attrs['ISO Efficiency'] ||
                 attrs['Multi-Pass Efficiency'] ||
                 attrs['Multi Pass Efficiency'] ||
                 attrs['βx Efficiency'] ||
                 attrs['Beta Efficiency'] ||
                 attrs['Efficiency @ 10 µm'] ||
                 attrs['Efficiency @ 20 µm'] ||
                 attrs['Efficiency at 10 micron'] ||
                 attrs['Efficiency at 20 micron'] ||
                 attrs['Eficiencia ISO'] ||
                 attrs['Eficiencia Multi-Pass'] || ''
                )).toLowerCase();
            const pm = valStr.match(/(\d+(?:\.\d+)?)\s*%?/);
            const val = pm ? parseFloat(pm[1]) : NaN;
            if ((isOil || isHydraulic) && (isNaN(val) || valStr.trim() === '')) {
                return '⚠️ Falta Eficiencia Principal ISO (AM) para tipo Oil/Hydraulic.';
            }
            if ((isAir || isCabin) && valStr.trim() !== '') {
                return '⚠️ Air/Cabin: la Eficiencia ISO debe ser vacía; revisar.';
            }
            const desc = String((attrs.description || data.description || '')).toLowerCase();
            const isElimtek = /elimtek|absolut[oa]/.test(desc);
            if (isElimtek && !isNaN(val) && val < 98) {
                return '⚠️ ELIMTEK™/Absoluta: se espera ≥98% (Multi-Pass).';
            }
            return '';
        })(),
        seal_material_indice_mongo: (() => {
            const subtypeRaw = String((attrs.subtype || data.subtype || '')).trim().toLowerCase();
            const isPanel = /\bpanel\b/.test(subtypeRaw);
            const isCabin = /\bcabin\b|\bcabina\b/.test(subtypeRaw);
            if (isPanel || isCabin) return undefined;
            const raw = (
                attrs.seal_material ||
                attrs['Seal Material'] ||
                attrs['Gasket Material'] ||
                attrs['Seal Composition'] ||
                attrs['Material de la Junta'] ||
                attrs['Material del Sello'] ||
                ''
            );
            const s = String(raw).trim().toLowerCase();
            const mapSeal = (t) => {
                if (!t) return undefined;
                if (/(nitrile|nitrilo|buna\s*-?n|nbr|buna)/i.test(t)) return 'Nitrilo (NBR) / Buna-N';
                if (/(silicone|silicona|vmq)/i.test(t)) return 'Silicona (VMQ)';
                if (/(viton|fkm|fluorocarbon|fluoro\s*elastomer|fluoroelast[oó]mero)/i.test(t)) return 'Fluorocarbono (Viton / FKM)';
                if (/(acrylic|acr[ií]lico|acm)/i.test(t)) return 'Acrílico (ACM)';
                if (/(epdm|ethylene[- ]propylene|etileno[- ]propileno)/i.test(t)) return 'Etileno-Propileno (EPDM)';
                return undefined;
            };
            return mapSeal(s);
        })(),
        seal_material_quality_flag: (() => {
            const subtypeRaw = String((attrs.subtype || data.subtype || '')).trim().toLowerCase();
            const isSpinOn = /\bspin\s*-?on\b|\broscado\b|\benroscado\b|\benroscable\b/.test(subtypeRaw);
            const isSeparator = /\bseparator\b|\bseparador\b/.test(subtypeRaw);
            const isRadialSeal = /\bradial\s*seal\b|\bsello\s*radial\b/.test(subtypeRaw);
            const isPanel = /\bpanel\b/.test(subtypeRaw);
            const isCabin = /\bcabin\b|\bcabina\b/.test(subtypeRaw);
            const mat = String((attrs.seal_material || attrs['Seal Material'] || attrs['Gasket Material'] || attrs['Seal Composition'] || attrs['Material de la Junta'] || attrs['Material del Sello'] || '')).trim();
            const normalized = (() => {
                const s = mat.toLowerCase();
                if (/(nitrile|nitrilo|buna\s*-?n|nbr|buna)/i.test(s)) return 'Nitrilo (NBR) / Buna-N';
                if (/(silicone|silicona|vmq)/i.test(s)) return 'Silicona (VMQ)';
                if (/(viton|fkm|fluorocarbon|fluoro\s*elastomer|fluoroelast[oó]mero)/i.test(s)) return 'Fluorocarbono (Viton / FKM)';
                if (/(acrylic|acr[ií]lico|acm)/i.test(s)) return 'Acrílico (ACM)';
                if (/(epdm|ethylene[- ]propylene|etileno[- ]propileno)/i.test(s)) return 'Etileno-Propileno (EPDM)';
                return '';
            })();
            if ((isSpinOn || isSeparator || isRadialSeal) && !normalized) {
                return '⚠️ Falta Material del Sello (AK) para diseño spin-on/separador/sello radial.';
            }
            if ((isPanel || isCabin) && normalized) {
                return '⚠️ Panel/Cabina: material del sello debe ser vacío; revisar.';
            }
            // Coherencia con temperatura y químicos
            if (normalized === 'Nitrilo (NBR) / Buna-N' && Number(tempMaxCVal) >= 130) {
                return '⚠️ NBR no óptimo para ≥130°C; considerar Silicona (VMQ) o FKM.';
            }
            const rawFluid = String(
                attrs.fluid_compatibility ||
                attrs.suitable_for ||
                attrs['suitable for'] ||
                attrs.fluid_type ||
                attrs['fluid type'] ||
                attrs.chemical_compatibility ||
                attrs['chemical compatibility'] ||
                ''
            ).toLowerCase();
            const demandsHighChem = /biodi[eé]sel|bio[- ]diesel|sint[eé]tico|synthetic/.test(rawFluid);
            if (demandsHighChem && normalized && normalized !== 'Fluorocarbono (Viton / FKM)') {
                return '⚠️ Alta exigencia química: preferir Fluorocarbono (Viton / FKM).';
            }
            return '';
        })(),
        housing_material_indice_mongo: (() => {
            const raw = (
                attrs.housing_material ||
                attrs['Housing Material'] ||
                attrs['Body Composition'] ||
                attrs['Material de Envoltura'] ||
                attrs['Material de la Carcasa'] ||
                ''
            );
            const s = String(raw).trim().toLowerCase();
            const mapHousing = (t) => {
                if (!t) return undefined;
                if (/(stainless\s*steel|inox|inoxidabl[e]?|ss\s*(304|316)?)/i.test(t)) return 'Acero Inoxidable (Stainless Steel)';
                if (/(steel|acero)(?!\s*inox)/i.test(t) || /(galvanizado|carbon\s*steel)/i.test(t)) return 'Acero (Steel)';
                if (/(alumin[ií]o|aluminum)/i.test(t)) return 'Aluminio (Aluminum)';
                if (/(nylon|polymer|pl[aá]stico|polyamide|pa\s*66|composite)/i.test(t)) return 'Nylon/Plástico Reforzado (Polymer/Nylon)';
                if (/(fiberglass|fibra\s*de\s*vidrio|frp)/i.test(t)) return 'Fibra de Vidrio Reforzada (Fiberglass Reinforced)';
                return undefined;
            };
            return mapHousing(s);
        })(),
        housing_material_quality_flag: (() => {
            const subtypeRaw = String((attrs.subtype || data.subtype || '')).trim().toLowerCase();
            const isSpinOn = /\bspin\s*-?on\b|\broscado\b|\benroscado\b|\benroscable\b/.test(subtypeRaw);
            const isSeparator = /\bseparator\b|\bseparador\b/.test(subtypeRaw);
            const isCartridge = /\b(cartridge|elemento|cartucho)\b/.test(subtypeRaw);
            const matRaw = (
                attrs.housing_material ||
                attrs['Housing Material'] ||
                attrs['Body Composition'] ||
                attrs['Material de Envoltura'] ||
                attrs['Material de la Carcasa'] ||
                ''
            );
            const s = String(matRaw).trim().toLowerCase();
            const normalized = (() => {
                if (!s) return '';
                if (/(stainless\s*steel|inox|inoxidabl[e]?|ss\s*(304|316)?)/i.test(s)) return 'Acero Inoxidable (Stainless Steel)';
                if (/(steel|acero)(?!\s*inox)/i.test(s) || /(galvanizado|carbon\s*steel)/i.test(s)) return 'Acero (Steel)';
                if (/(alumin[ií]o|aluminum)/i.test(s)) return 'Aluminio (Aluminum)';
                if (/(nylon|polymer|pl[aá]stico|polyamide|pa\s*66|composite)/i.test(s)) return 'Nylon/Plástico Reforzado (Polymer/Nylon)';
                if (/(fiberglass|fibra\s*de\s*vidrio|frp)/i.test(s)) return 'Fibra de Vidrio Reforzada (Fiberglass Reinforced)';
                return '';
            })();
            const hasHousingSignals = (
                !isNaN(parseFloat(String(attrs.hydrostatic_burst_psi || '').replace(/[^0-9\.]/g,''))) ||
                !isNaN(parseFloat(String(attrs.operating_pressure_max_psi || '').replace(/[^0-9\.]/g,'')))
            );
            if ((isSpinOn || isSeparator || (isCartridge && hasHousingSignals)) && !normalized) {
                return '⚠️ Falta Material de Carcasa (AL) para diseño requerido (spin-on/separador/cartucho con carcasa).';
            }
            return '';
        })(),
        inner_diameter_mm_indice_mongo: (() => {
            const subtypeRaw = String((attrs.subtype || data.subtype || '')).trim().toLowerCase();
            const isSpinOn = /\bspin\s*-?on\b|\broscado\b|\benroscado\b|\benroscable\b/i.test(subtypeRaw);
            const isPanel = /\bpanel\b/i.test(subtypeRaw);
            if (isSpinOn || isPanel) return undefined;
            const raw = (
                attrs.inner_diameter_mm ||
                attrs.inner_diameter ||
                attrs['Inner Diameter'] ||
                attrs['I.D.'] ||
                attrs.ID ||
                attrs['Minor Diameter'] ||
                attrs.minor_diameter ||
                attrs['Diámetro interior'] ||
                attrs['Diámetro menor'] ||
                ''
            );
            const val = parseFloat(normalizeMM(raw) || '');
            return isNaN(val) ? undefined : val;
        })(),
        inner_diameter_quality_flag: (() => {
            const subtypeRaw = String((attrs.subtype || data.subtype || '')).trim().toLowerCase();
            const isSpinOn = /\bspin\s*-?on\b|\broscado\b|\benroscado\b|\benroscable\b/i.test(subtypeRaw);
            const isPanel = /\bpanel\b/i.test(subtypeRaw);
            const isCartridge = /\b(cartridge|elemento|cartucho)\b/i.test(subtypeRaw);
            const isRadialSeal = /\bradial\s*seal\b|\bsello\s*radial\b/i.test(subtypeRaw);
            if (isSpinOn || isPanel) return '';

            const innerVal = parseFloat(
                normalizeMM(
                    attrs.inner_diameter_mm ||
                    attrs.inner_diameter ||
                    attrs['Inner Diameter'] ||
                    attrs['I.D.'] ||
                    attrs.ID ||
                    attrs['Minor Diameter'] ||
                    attrs.minor_diameter ||
                    attrs['Diámetro interior'] ||
                    attrs['Diámetro menor'] ||
                    ''
                ) || ''
            );

            if (isCartridge || isRadialSeal) {
                if (isNaN(innerVal)) {
                    return '⚠️ Falta Diámetro Interior (mm) para diseño cartucho/sello radial.';
                }
                if (!isNaN(odVal) && innerVal >= odVal) {
                    return '⚠️ Dimensión inconsistente: inner_diameter_mm debe ser menor que outer_diameter_mm.';
                }
                const hasThread = !!String(attrs.thread_size || '').trim();
                const hasGasketOD = !!normalizeMM(attrs.gasket_od_mm || attrs['Gasket OD'] || '');
                const hasGasketID = !!normalizeMM(attrs.gasket_id_mm || attrs['Gasket ID'] || '');
                if (hasThread || hasGasketOD || hasGasketID) {
                    return '⚠️ Diseño cartucho/sello radial: usar diámetro interior en lugar de rosca/junta.';
                }
            }
            return '';
        })(),
        pleat_count_indice_mongo: (() => {
            const subtypeRaw = String((attrs.subtype || data.subtype || '')).trim().toLowerCase();
            const isSpinOn = /\bspin\s*-?on\b|\broscado\b|\benroscado\b|\benroscable\b/.test(subtypeRaw);
            if (isSpinOn) return undefined;
            const raw = (
                attrs.pleat_count ||
                attrs['Pleat Count'] ||
                attrs['Number of Pleats'] ||
                attrs['Cantidad de Pliegues'] ||
                ''
            );
            const m = String(raw).match(/(\d{1,5})/);
            if (!m) return undefined;
            const n = parseInt(m[1], 10);
            return Number.isFinite(n) ? n : undefined;
        })(),
        pleat_count_quality_flag: (() => {
            const subtypeRaw = String((attrs.subtype || data.subtype || '')).trim().toLowerCase();
            const isSpinOn = /\bspin\s*-?on\b|\broscado\b|\benroscado\b|\benroscable\b/.test(subtypeRaw);
            const isPanel = /\bpanel\b/.test(subtypeRaw);
            const isCartridge = /\b(cartridge|elemento|cartucho)\b/.test(subtypeRaw);
            const isRadialSeal = /\bradial\s*seal\b|\bsello\s*radial\b/.test(subtypeRaw);
            if (isSpinOn) return '';
            const raw = (
                attrs.pleat_count ||
                attrs['Pleat Count'] ||
                attrs['Number of Pleats'] ||
                attrs['Cantidad de Pliegues'] ||
                ''
            );
            const m = String(raw).match(/(\d{1,5})/);
            const val = m ? parseInt(m[1], 10) : NaN;
            if ((isPanel || isCartridge) && isNaN(val)) {
                return '⚠️ Falta Conteo de Pliegues (AJ) para diseño panel/cartucho.';
            }
            const text = [finalDescription, data.description, attrs.description].map(v => String(v || '')).join(' ').toUpperCase();
            const claimsPremium = /ELIMTEK|MACROCORE/.test(text);
            if (claimsPremium && !isNaN(val)) {
                const minPanel = 30;
                const minElement = 100;
                if ((isPanel && val < minPanel) || ((isCartridge || isRadialSeal) && val < minElement)) {
                    return '⚠️ Pliegues bajos para tecnología premium; revisar capacidad/diseño.';
                }
            }
            return '';
        })(),
        water_separation_efficiency_percent_indice_mongo: (() => {
            if (familyPrefix !== 'FUEL') return undefined;
            const raw = (
                attrs.water_separation_efficiency_percent ||
                attrs.water_separation_efficiency ||
                attrs.wse ||
                attrs['Water Separation Efficiency'] ||
                attrs['WSE'] ||
                attrs['Rendimiento de Separación de H2O'] ||
                attrs['Eficiencia de Separación de Agua'] ||
                ''
            );
            const lower = String(raw).toLowerCase().replace(/,/g, '.');
            const m = lower.match(/([0-9]+(?:\.[0-9]+)?)/);
            if (!m) return undefined;
            const n = parseFloat(m[1]);
            if (isNaN(n)) return undefined;
            const val = Math.max(0, Math.min(100, n));
            return Number(val.toFixed(1));
        })(),
        water_separation_efficiency_quality_flag: (() => {
            if (familyPrefix !== 'FUEL') return '';
            const isSeparator = /separator|separador|separación/i.test(String(subtypeDescriptor || ''));
            const raw = (
                attrs.water_separation_efficiency_percent ||
                attrs.water_separation_efficiency ||
                attrs.wse ||
                attrs['Water Separation Efficiency'] ||
                attrs['WSE'] ||
                attrs['Rendimiento de Separación de H2O'] ||
                attrs['Eficiencia de Separación de Agua'] ||
                ''
            );
            const lower = String(raw).toLowerCase().replace(/,/g, '.');
            const m = lower.match(/([0-9]+(?:\.[0-9]+)?)/);
            const hasNum = !!m && !isNaN(parseFloat(m[1]));
            if (isSeparator && !hasNum) return '⚠️ Falta Eficiencia de Separación de Agua (%) para separador.';
            if (!hasNum) return '';
            let n = parseFloat(m[1]);
            if (isNaN(n)) return '';
            if (n <= 0 || n > 100) return '⚠️ Valor inválido de eficiencia (% fuera de rango).';
            if (n < 90) return '⚠️ Eficiencia baja (<90%).';
            if (n >= 90 && n < 95) return '⚠️ Eficiencia moderada (90–95%).';
            // Coherencia con tecnología extendida si se menciona ~99%
            const desc = String(attrs.description || '').toUpperCase();
            if (/ELIMTEK|EXTENDED/.test(desc) && n < 95) {
                return '⚠️ Inconsistente con tecnología extendida 99%; revisar.';
            }
            return '';
        })(),
        panel_depth_mm_indice_mongo: (() => {
            const applicable = new Set(['AIR','CABIN']);
            if (!applicable.has(familyPrefix)) return undefined;
            const isPanelDesign = /panel/i.test(String(subtypeDescriptor || ''));
            if (!isPanelDesign) return undefined;
            const raw = (
                attrs.panel_depth_mm ||
                attrs.depth ||
                attrs.thickness ||
                attrs.height ||
                attrs['Depth'] ||
                attrs['Thickness'] ||
                attrs['Panel Height'] ||
                attrs['Altura del Panel'] ||
                attrs['Grosor'] ||
                ''
            );
            const norm = normalizeMM(raw);
            const num = parseFloat(norm || '');
            return isNaN(num) ? undefined : Number(num.toFixed(2));
        })(),
        panel_depth_quality_flag: (() => {
            const applicable = new Set(['AIR','CABIN']);
            if (!applicable.has(familyPrefix)) return '';
            const isPanelDesign = /panel/i.test(String(subtypeDescriptor || ''));
            if (!isPanelDesign) return '';
            const raw = (
                attrs.panel_depth_mm ||
                attrs.depth ||
                attrs.thickness ||
                attrs.height ||
                attrs['Depth'] ||
                attrs['Thickness'] ||
                attrs['Panel Height'] ||
                attrs['Altura del Panel'] ||
                attrs['Grosor'] ||
                ''
            );
            const norm = normalizeMM(raw);
            const num = parseFloat(norm || '');
            if (isNaN(num) || num <= 0) return '⚠️ Falta Profundidad/Grosor de Panel (mm).';
            // Coherencia de diseño: si hay diámetro exterior para panel, advertir uso de ancho/longitud/profundidad.
            const od = parseFloat(normalizeMM(attrs.outer_diameter_mm || attrs.outer_diameter || '') || '');
            if (!isNaN(od) && od > 0) {
                return '⚠️ Diseño Panel: usar anchura/longitud/profundidad en lugar de diámetro exterior.';
            }
            // Integridad dimensional básica: si existe anchura pero falta profundidad (o viceversa) señalar completar terna.
            const w = parseFloat(normalizeMM(
                (attrs.panel_width_mm || attrs.width || attrs.panel_width || attrs['Panel Width'] || '')
            ) || '');
            if (isNaN(w)) {
                return '⚠️ Falta Anchura de Panel; completar dimensiones (ancho, largo, profundidad).';
            }
            return '';
        })(),
        panel_width_mm_indice_mongo: (() => {
            const applicable = new Set(['AIR','CABIN']);
            if (!applicable.has(familyPrefix)) return undefined;
            const isPanelDesign = /panel/i.test(String(subtypeDescriptor || ''));
            if (!isPanelDesign) return undefined;
            const raw = (
                attrs.panel_width_mm ||
                attrs.width ||
                attrs.panel_width ||
                attrs.secondary_dimension ||
                attrs['Width'] ||
                attrs['Panel Width'] ||
                attrs['Secondary Dimension'] ||
                attrs['Ancho'] ||
                attrs['Anchura'] ||
                ''
            );
            const norm = normalizeMM(raw);
            const num = parseFloat(norm || '');
            return isNaN(num) ? undefined : Number(num.toFixed(2));
        })(),
        panel_width_quality_flag: (() => {
            const applicable = new Set(['AIR','CABIN']);
            if (!applicable.has(familyPrefix)) return '';
            const isPanelDesign = /panel/i.test(String(subtypeDescriptor || ''));
            if (!isPanelDesign) return '';
            const raw = (
                attrs.panel_width_mm ||
                attrs.width ||
                attrs.panel_width ||
                attrs.secondary_dimension ||
                attrs['Width'] ||
                attrs['Panel Width'] ||
                attrs['Secondary Dimension'] ||
                attrs['Ancho'] ||
                attrs['Anchura'] ||
                ''
            );
            const norm = normalizeMM(raw);
            const num = parseFloat(norm || '');
            if (isNaN(num) || num <= 0) return '⚠️ Falta Anchura de Panel (mm).';
            // Coherencia: si diseño panel, no debería depender de outer_diameter_mm
            const od = parseFloat(normalizeMM(attrs.outer_diameter_mm || attrs.outer_diameter || '') || '');
            if (!isNaN(od) && od > 0) {
                return '⚠️ Diseño Panel: usar anchura/longitud en lugar de diámetro exterior.';
            }
            return '';
        })(),
        micron_rating_indice_mongo: (isNaN(micronVal) ? undefined : micronVal),
        operating_temperature_min_c_indice_mongo: (isNaN(tempMinCVal) ? undefined : Number(tempMinCVal.toFixed(1))),
        operating_temperature_min_quality_flag: tempMinQualityFlag,
        operating_temperature_max_c_indice_mongo: (isNaN(tempMaxCVal) ? undefined : Number(tempMaxCVal.toFixed(1))),
        operating_temperature_max_quality_flag: tempMaxQualityFlag,
        bypass_valve_psi_indice_mongo: (() => {
            const liquidFamilies = new Set(['OIL','FUEL','HYDRAULIC','COOLANT']);
            const isFullFlow = /full[- ]?flow|flujo total/i.test(String(subtypeDescriptor || ''));
            if (!liquidFamilies.has(familyPrefix)) return undefined;
            if (!isSpinOnDesign) return undefined;
            if ((familyPrefix === 'OIL' || familyPrefix === 'FUEL') && !isFullFlow) return undefined;
            const raw = (
                attrs.bypass_valve_psi ||
                attrs.bypass_valve_setting ||
                attrs.relief_valve_pressure ||
                attrs.relief_pressure ||
                attrs.presion_derivacion ||
                attrs['presión de derivación'] ||
                attrs['presion de derivacion'] ||
                ''
            );
            const val = normalizePressureToPsi(raw);
            return isNaN(val) ? undefined : Number(val.toFixed(1));
        })(),
        bypass_valve_quality_flag: (() => {
            const isFullFlow = /full[- ]?flow|flujo total/i.test(String(subtypeDescriptor || ''));
            const isOilOrFuel = (familyPrefix === 'OIL' || familyPrefix === 'FUEL');
            if (!isOilOrFuel) return '';
            if (!isSpinOnDesign) return '';
            if (!isFullFlow) return '';
            const raw = (
                attrs.bypass_valve_psi ||
                attrs.bypass_valve_setting ||
                attrs.relief_valve_pressure ||
                attrs.relief_pressure ||
                attrs.presion_derivacion ||
                attrs['presión de derivación'] ||
                attrs['presion de derivacion'] ||
                ''
            );
            const val = normalizePressureToPsi(raw);
            if (isNaN(val)) return '⚠️ Falta presión de válvula de derivación (Bypass) para Spin-On Full-Flow en OIL/FUEL.';
            // Sanity bounds for LD oil filters (typical 8–30 PSI)
            if (val < 5) return '⚠️ Bypass muy bajo; podría derivar flujo sin filtrar prematuramente.';
            if (val > 35) return '⚠️ Bypass muy alto; riesgo de hambre de aceite si el filtro se obstruye.';
            return '';
        })(),
        hydrostatic_burst_psi: (() => {
            const applicable = new Set(['OIL','FUEL','HYDRAULIC']);
            if (!applicable.has(familyPrefix)) return '';
            const raw = (
                attrs.hydrostatic_burst_psi ||
                attrs.burst_pressure ||
                attrs['Burst Pressure'] ||
                attrs.maximum_structural_strength ||
                attrs.structural_strength ||
                attrs['presión de estallido'] ||
                attrs['presion de estallido'] ||
                attrs['Presión de Estallido'] ||
                ''
            );
            const val = normalizePressureToPsi(raw);
            return isNaN(val) || val <= 0 ? '' : Math.round(val);
        })(),
        hydrostatic_burst_psi_indice_mongo: (() => {
            const applicable = new Set(['OIL','FUEL','HYDRAULIC']);
            if (!applicable.has(familyPrefix)) return undefined;
            const raw = (
                attrs.hydrostatic_burst_psi ||
                attrs.burst_pressure ||
                attrs['Burst Pressure'] ||
                attrs.maximum_structural_strength ||
                attrs.structural_strength ||
                attrs['presión de estallido'] ||
                attrs['presion de estallido'] ||
                attrs['Presión de Estallido'] ||
                ''
            );
            const val = normalizePressureToPsi(raw);
            return isNaN(val) || val <= 0 ? undefined : Math.round(val);
        })(),
        hydrostatic_burst_quality_flag: (() => {
            const applicable = new Set(['OIL','FUEL','HYDRAULIC']);
            if (!applicable.has(familyPrefix)) return '';
            const rawBurst = (
                attrs.hydrostatic_burst_psi ||
                attrs.burst_pressure ||
                attrs['Burst Pressure'] ||
                attrs.maximum_structural_strength ||
                attrs.structural_strength ||
                attrs['presión de estallido'] ||
                attrs['presion de estallido'] ||
                attrs['Presión de Estallido'] ||
                ''
            );
            const burst = normalizePressureToPsi(rawBurst);
            if (isNaN(burst) || burst <= 0) return '⚠️ Falta Presión Hidrostática de Estallido (PSI).';
            // Validación con presión operativa máxima
            const rawOpMax = (
                attrs.operating_pressure_max_psi ||
                attrs.maximum_operating_pressure ||
                attrs.working_pressure ||
                attrs.operating_pressure_max ||
                ''
            );
            const opMax = normalizePressureToPsi(rawOpMax);
            if (!isNaN(opMax) && opMax > 0) {
                if (burst <= opMax * 1.5) return '⚠️ Burst cercano a presión operativa; debe ser significativamente mayor.';
            }
            // Coherencia con presión de bypass
            const rawBypass = (
                attrs.bypass_valve_psi ||
                attrs.bypass_valve_setting ||
                attrs.relief_valve_pressure ||
                attrs.relief_pressure ||
                attrs.presion_derivacion ||
                attrs['presión de derivación'] ||
                attrs['presion de derivacion'] ||
                ''
            );
            const bypass = normalizePressureToPsi(rawBypass);
            if (!isNaN(bypass) && bypass > 0) {
                if (burst <= (bypass + 100)) return '⚠️ Burst insuficiente respecto a bypass; debe exceder ampliamente.';
            }
            // Umbral típico mínimo
            if (burst < 250) return '⚠️ Burst muy bajo (típicamente >250 PSI en HD).';
            return '';
        })(),
        dirt_capacity_grams: (() => {
            const applicable = new Set(['AIR','OIL','FUEL','HYDRAULIC']);
            if (!applicable.has(familyPrefix)) return '';
            const raw = (
                attrs.dirt_capacity_grams ||
                attrs.dirt_holding_capacity ||
                attrs['Dirt Holding Capacity'] ||
                attrs.dust_capacity ||
                attrs.dust_holding_capacity ||
                attrs['Capacidad de Polvo'] ||
                attrs['capacidad de polvo'] ||
                attrs['Gramos Retenidos'] ||
                attrs['gramos retenidos'] ||
                ''
            );
            const s = String(raw).trim();
            if (!s) return '';
            const lower = s.toLowerCase().replace(/,/g, '.');
            const numMatch = lower.match(/([0-9]+(?:\.[0-9]+)?)/);
            if (!numMatch) return '';
            const n = parseFloat(numMatch[1]);
            if (isNaN(n) || n <= 0) return '';
            let grams = n;
            if (/mg|miligr/.test(lower)) grams = n / 1000;
            else if (/kg|kilogr/.test(lower)) grams = n * 1000;
            else if (/(lb|l b|l\s*b|libras|libra|pound)/.test(lower)) grams = n * 453.59;
            else if (/(oz|onza|onzas|ounce)/.test(lower)) grams = n * 28.3495;
            // Default assumes grams
            return Math.round(grams * 100) / 100; // 2 decimales
        })(),
        dirt_capacity_grams_indice_mongo: (() => {
            const applicable = new Set(['AIR','OIL','FUEL','HYDRAULIC']);
            if (!applicable.has(familyPrefix)) return undefined;
            const raw = (
                attrs.dirt_capacity_grams ||
                attrs.dirt_holding_capacity ||
                attrs['Dirt Holding Capacity'] ||
                attrs.dust_capacity ||
                attrs.dust_holding_capacity ||
                attrs['Capacidad de Polvo'] ||
                attrs['capacidad de polvo'] ||
                attrs['Gramos Retenidos'] ||
                attrs['gramos retenidos'] ||
                ''
            );
            const s = String(raw).trim();
            if (!s) return undefined;
            const lower = s.toLowerCase().replace(/,/g, '.');
            const numMatch = lower.match(/([0-9]+(?:\.[0-9]+)?)/);
            if (!numMatch) return undefined;
            const n = parseFloat(numMatch[1]);
            if (isNaN(n) || n <= 0) return undefined;
            let grams = n;
            if (/mg|miligr/.test(lower)) grams = n / 1000;
            else if (/kg|kilogr/.test(lower)) grams = n * 1000;
            else if (/(lb|l b|l\s*b|libras|libra|pound)/.test(lower)) grams = n * 453.59;
            else if (/(oz|onza|onzas|ounce)/.test(lower)) grams = n * 28.3495;
            return Math.round(grams * 100) / 100;
        })(),
        dirt_capacity_quality_flag: (() => {
            const applicable = new Set(['AIR','OIL','FUEL','HYDRAULIC']);
            if (!applicable.has(familyPrefix)) return '';
            const raw = (
                attrs.dirt_capacity_grams ||
                attrs.dirt_holding_capacity ||
                attrs['Dirt Holding Capacity'] ||
                attrs.dust_capacity ||
                attrs.dust_holding_capacity ||
                attrs['Capacidad de Polvo'] ||
                attrs['capacidad de polvo'] ||
                attrs['Gramos Retenidos'] ||
                attrs['gramos retenidos'] ||
                ''
            );
            const s = String(raw).trim();
            const lower = s.toLowerCase().replace(/,/g, '.');
            const numMatch = lower.match(/([0-9]+(?:\.[0-9]+)?)/);
            const hasValue = !!numMatch && parseFloat(numMatch[1]) > 0;
            if (!hasValue) return '⚠️ Falta Capacidad de Suciedad (g).';
            // Heurística de coherencia con tecnología premium
            const mediaRaw = (
                attrs.media_type ||
                attrs.media ||
                attrs.technology ||
                attrs['tecnología'] ||
                attrs['medio filtrante'] ||
                attrs.medio_filtrante ||
                attrs.description ||
                ''
            );
            const media = String(mediaRaw).toLowerCase();
            const num = (() => {
                let grams = parseFloat(numMatch[1]);
                if (isNaN(grams) || grams <= 0) return NaN;
                if (/mg|miligr/.test(lower)) grams = grams / 1000;
                else if (/kg|kilogr/.test(lower)) grams = grams * 1000;
                else if (/(lb|l b|l\s*b|libras|libra|pound)/.test(lower)) grams = grams * 453.59;
                else if (/(oz|onza|onzas|ounce)/.test(lower)) grams = grams * 28.3495;
                return grams;
            })();
            if (!isNaN(num)) {
                const isMacrocore = media.includes('macrocore');
                const isElimtek = media.includes('elimtek');
                const isSynUltra = media.includes('synthetic') || media.includes('ultra');
                if (isMacrocore && num < 300) return '⚠️ Capacidad de Suciedad baja para MACROCORE™.';
                if (isElimtek && isSynUltra && num < 200) return '⚠️ Capacidad de Suciedad baja para ELIMTEK™ ULTRA/SYNTHETIC.';
            }
            return '';
        })(),
        // Peso del filtro (Columna AD): normaliza y convierte a gramos
        weight_grams: (() => {
            const applicable = new Set(['AIR','OIL','FUEL','HYDRAULIC','CABIN','COOLANT']);
            if (!applicable.has(familyPrefix)) return '';
            const raw = (
                attrs.weight_grams ||
                attrs.weight ||
                attrs.net_weight ||
                attrs.shipping_weight ||
                attrs['Weight'] ||
                attrs['Net Weight'] ||
                attrs['Shipping Weight'] ||
                attrs['Peso'] ||
                attrs['Peso Neto'] ||
                attrs['Peso Bruto'] ||
                ''
            );
            const s = String(raw).trim();
            if (!s) return '';
            const lower = s.toLowerCase().replace(/,/g, '.');
            const numMatch = lower.match(/([0-9]+(?:\.[0-9]+)?)/);
            if (!numMatch) return '';
            const n = parseFloat(numMatch[1]);
            if (isNaN(n) || n <= 0) return '';
            let grams = n;
            if (/mg|miligr/.test(lower)) grams = n / 1000;
            else if (/kg|kilogr/.test(lower)) grams = n * 1000;
            else if (/(lb|l b|l\s*b|libras|libra|pound)/.test(lower)) grams = n * 453.59;
            else if (/(oz|onza|onzas|ounce)/.test(lower)) grams = n * 28.3495;
            // Default: asumir gramos
            return Math.round(grams * 100) / 100;
        })(),
        weight_grams_indice_mongo: (() => {
            const applicable = new Set(['AIR','OIL','FUEL','HYDRAULIC','CABIN','COOLANT']);
            if (!applicable.has(familyPrefix)) return undefined;
            const raw = (
                attrs.weight_grams ||
                attrs.weight ||
                attrs.net_weight ||
                attrs.shipping_weight ||
                attrs['Weight'] ||
                attrs['Net Weight'] ||
                attrs['Shipping Weight'] ||
                attrs['Peso'] ||
                attrs['Peso Neto'] ||
                attrs['Peso Bruto'] ||
                ''
            );
            const s = String(raw).trim();
            if (!s) return undefined;
            const lower = s.toLowerCase().replace(/,/g, '.');
            const numMatch = lower.match(/([0-9]+(?:\.[0-9]+)?)/);
            if (!numMatch) return undefined;
            const n = parseFloat(numMatch[1]);
            if (isNaN(n) || n <= 0) return undefined;
            let grams = n;
            if (/mg|miligr/.test(lower)) grams = n / 1000;
            else if (/kg|kilogr/.test(lower)) grams = n * 1000;
            else if (/(lb|l b|l\s*b|libras|libra|pound)/.test(lower)) grams = n * 453.59;
            else if (/(oz|onza|onzas|ounce)/.test(lower)) grams = n * 28.3495;
            return Math.round(grams * 100) / 100;
        })(),
        weight_quality_flag: (() => {
            const applicable = new Set(['AIR','OIL','FUEL','HYDRAULIC','CABIN','COOLANT']);
            if (!applicable.has(familyPrefix)) return '';
            const raw = (
                attrs.weight_grams ||
                attrs.weight ||
                attrs.net_weight ||
                attrs.shipping_weight ||
                attrs['Weight'] ||
                attrs['Net Weight'] ||
                attrs['Shipping Weight'] ||
                attrs['Peso'] ||
                attrs['Peso Neto'] ||
                attrs['Peso Bruto'] ||
                ''
            );
            const s = String(raw).trim();
            const lower = s.toLowerCase().replace(/,/g, '.');
            const numMatch = lower.match(/([0-9]+(?:\.[0-9]+)?)/);
            const hasValue = !!numMatch && parseFloat(numMatch[1]) > 0;
            if (!hasValue) return '⚠️ Falta Peso del Filtro (g).';
            // Convert to grams for checks
            let grams = (() => {
                const n = parseFloat(numMatch[1]);
                if (isNaN(n) || n <= 0) return NaN;
                let v = n;
                if (/mg|miligr/.test(lower)) v = n / 1000;
                else if (/kg|kilogr/.test(lower)) v = n * 1000;
                else if (/(lb|l b|l\s*b|libras|libra|pound)/.test(lower)) v = n * 453.59;
                else if (/(oz|onza|onzas|ounce)/.test(lower)) v = n * 28.3495;
                return v;
            })();
            if (isNaN(grams)) return '';
            // Heurística por familia
            if (familyPrefix === 'CABIN' && grams > 1500) {
                return '⚠️ Peso alto para CABIN; revisar coherencia.';
            }
            if (familyPrefix === 'OIL' && String((data.duty || attrs.duty || '')).toUpperCase() === 'HD' && grams < 800) {
                return '⚠️ Peso bajo para OIL HD; revisar coherencia.';
            }
            // Coherencia con dimensiones (si disponibles)
            const hStr = String(attrs.height_mm || attrs.height || attrs.overall_height || attrs.total_length || '').trim();
            const odStr = String(attrs.outer_diameter_mm || attrs.outer_diameter || '').trim();
            const h = parseFloat(normalizeMM(hStr) || '');
            const od = parseFloat(normalizeMM(odStr) || '');
            if (!isNaN(h) && !isNaN(od)) {
                const scale = h * od; // mm^2 como métrica aproximada
                if (scale > 30000 && grams < 300) return '⚠️ Peso bajo para dimensiones grandes; revisar.';
                if (scale < 10000 && grams > 1500) return '⚠️ Peso alto para dimensiones pequeñas; revisar.';
            }
            // Coherencia con capacidad de suciedad
            const dcRaw = (
                attrs.dirt_capacity_grams ||
                attrs.dirt_holding_capacity ||
                attrs['Dirt Holding Capacity'] ||
                attrs.dust_capacity ||
                attrs.dust_holding_capacity ||
                attrs['Capacidad de Polvo'] ||
                attrs['capacidad de polvo'] ||
                attrs['Gramos Retenidos'] ||
                attrs['gramos retenidos'] ||
                ''
            );
            const dcStr = String(dcRaw).toLowerCase().replace(/,/g, '.');
            const dcMatch = dcStr.match(/([0-9]+(?:\.[0-9]+)?)/);
            if (dcMatch) {
                let dc = parseFloat(dcMatch[1]);
                if (!isNaN(dc)) {
                    if (/mg|miligr/.test(dcStr)) dc = dc / 1000;
                    else if (/kg|kilogr/.test(dcStr)) dc = dc * 1000;
                    else if (/(lb|l b|l\s*b|libras|libra|pound)/.test(dcStr)) dc = dc * 453.59;
                    else if (/(oz|onza|onzas|ounce)/.test(dcStr)) dc = dc * 28.3495;
                    if (!isNaN(dc) && grams < dc * 0.5) {
                        return '⚠️ Peso bajo respecto a capacidad de suciedad; revisar.';
                    }
                }
            }
            return '';
        })(),
        rated_flow_gpm: (() => {
            const applicable = new Set(['OIL','FUEL','HYDRAULIC','COOLANT']);
            if (!applicable.has(familyPrefix)) return '';
            const raw = (
                attrs.rated_flow_gpm ||
                attrs.flow_rate ||
                attrs.rated_flow ||
                attrs['Flow Rate'] ||
                attrs['Rated Flow'] ||
                attrs.gpm ||
                attrs.lpm ||
                attrs['LPM'] ||
                attrs['GPM'] ||
                attrs['Caudal'] ||
                attrs['Caudal Nominal'] ||
                attrs['gal/min'] ||
                attrs['l/min'] ||
                ''
            );
            const s = String(raw).trim();
            if (!s) return '';
            const lower = s.toLowerCase().replace(/,/g, '.');
            const numMatch = lower.match(/([0-9]+(?:\.[0-9]+)?)/);
            if (!numMatch) return '';
            const n = parseFloat(numMatch[1]);
            if (isNaN(n) || n <= 0) return '';
            let gpm = n;
            if (/(lpm|l\/min|l\s*min|litros\/min|litros por minuto)/.test(lower)) gpm = n * 0.26417;
            else if (/(gph|gal\/h|galones\/hora|gal per hour)/.test(lower)) gpm = n / 60;
            else if (/(lph|l\/h|litros\/hora|liters per hour)/.test(lower)) gpm = (n / 60) * 0.26417;
            else if (/(m3\/h|m³\/h|metros\s*cúbicos\/hora)/.test(lower)) gpm = (n * 16.6667) * 0.26417; // m3/h -> LPM -> GPM
            // Default assumes GPM
            return Math.round(gpm * 100) / 100;
        })(),
        rated_flow_gpm_indice_mongo: (() => {
            const applicable = new Set(['OIL','FUEL','HYDRAULIC','COOLANT']);
            if (!applicable.has(familyPrefix)) return undefined;
            const raw = (
                attrs.rated_flow_gpm ||
                attrs.flow_rate ||
                attrs.rated_flow ||
                attrs['Flow Rate'] ||
                attrs['Rated Flow'] ||
                attrs.gpm ||
                attrs.lpm ||
                attrs['LPM'] ||
                attrs['GPM'] ||
                attrs['Caudal'] ||
                attrs['Caudal Nominal'] ||
                attrs['gal/min'] ||
                attrs['l/min'] ||
                ''
            );
            const s = String(raw).trim();
            if (!s) return undefined;
            const lower = s.toLowerCase().replace(/,/g, '.');
            const numMatch = lower.match(/([0-9]+(?:\.[0-9]+)?)/);
            if (!numMatch) return undefined;
            const n = parseFloat(numMatch[1]);
            if (isNaN(n) || n <= 0) return undefined;
            let gpm = n;
            if (/(lpm|l\/min|l\s*min|litros\/min|litros por minuto)/.test(lower)) gpm = n * 0.26417;
            else if (/(gph|gal\/h|galones\/hora|gal per hour)/.test(lower)) gpm = n / 60;
            else if (/(lph|l\/h|litros\/hora|liters per hour)/.test(lower)) gpm = (n / 60) * 0.26417;
            else if (/(m3\/h|m³\/h|metros\s*cúbicos\/hora)/.test(lower)) gpm = (n * 16.6667) * 0.26417;
            return Math.round(gpm * 100) / 100;
        })(),
        rated_flow_quality_flag: (() => {
            const applicable = new Set(['OIL','FUEL','HYDRAULIC','COOLANT']);
            if (!applicable.has(familyPrefix)) return '';
            const raw = (
                attrs.rated_flow_gpm ||
                attrs.flow_rate ||
                attrs.rated_flow ||
                attrs['Flow Rate'] ||
                attrs['Rated Flow'] ||
                attrs.gpm ||
                attrs.lpm ||
                attrs['LPM'] ||
                attrs['GPM'] ||
                attrs['Caudal'] ||
                attrs['Caudal Nominal'] ||
                attrs['gal/min'] ||
                attrs['l/min'] ||
                ''
            );
            const s = String(raw).trim();
            const lower = s.toLowerCase().replace(/,/g, '.');
            const numMatch = lower.match(/([0-9]+(?:\.[0-9]+)?)/);
            const hasValue = !!numMatch && parseFloat(numMatch[1]) > 0;
            if (!hasValue) return '⚠️ Falta Flujo Nominal (GPM).';
            // Heurística: líneas ELIMTEK™ SYNTHETIC/ULTRA deberían tener flujo superior
            const mediaRaw = (
                attrs.media_type ||
                attrs.media ||
                attrs.technology ||
                attrs['tecnología'] ||
                attrs['medio filtrante'] ||
                attrs.medio_filtrante ||
                attrs.description ||
                ''
            );
            const media = String(mediaRaw).toLowerCase();
            let gpm = (() => {
                const n = parseFloat(numMatch[1]);
                if (isNaN(n) || n <= 0) return NaN;
                let v = n;
                if (/(lpm|l\/min|l\s*min|litros\/min|litros por minuto)/.test(lower)) v = n * 0.26417;
                else if (/(gph|gal\/h|galones\/hora|gal per hour)/.test(lower)) v = n / 60;
                else if (/(lph|l\/h|litros\/hora|liters per hour)/.test(lower)) v = (n / 60) * 0.26417;
                else if (/(m3\/h|m³\/h|metros\s*cúbicos\/hora)/.test(lower)) v = (n * 16.6667) * 0.26417;
                return v;
            })();
            const isElimtek = media.includes('elimtek');
            const isSynUltra = media.includes('synthetic') || media.includes('ultra');
            if (!isNaN(gpm) && isElimtek && isSynUltra && gpm < 10) {
                return '⚠️ Flujo Nominal bajo para ELIMTEK™ ULTRA/SYNTHETIC.';
            }
            return '';
        })(),
        rated_flow_cfm: (() => {
            const applicable = new Set(['AIR','AIR DRYER']);
            if (!applicable.has(familyPrefix)) return '';
            const raw = (
                attrs.rated_flow_cfm ||
                attrs.flow_rate ||
                attrs.rated_cfm ||
                attrs.scfm ||
                attrs['Flow Rate'] ||
                attrs['Rated CFM'] ||
                attrs['SCFM'] ||
                attrs['Caudal de Aire'] ||
                attrs['Caudal de Aire Nominal'] ||
                attrs['m3/min'] ||
                attrs['m³/min'] ||
                attrs['L/s'] ||
                attrs['l/s'] ||
                attrs['L/min'] ||
                attrs['l/min'] ||
                attrs['CFM'] ||
                ''
            );
            const s = String(raw).trim();
            if (!s) return '';
            const lower = s.toLowerCase().replace(/,/g, '.');
            const numMatch = lower.match(/([0-9]+(?:\.[0-9]+)?)/);
            if (!numMatch) return '';
            const n = parseFloat(numMatch[1]);
            if (isNaN(n) || n <= 0) return '';
            let cfm = n;
            if (/(m3\/min|m³\/min)/.test(lower)) cfm = n * 35.315;
            else if (/(l\/s|l\s*s|litros\/seg|litros por segundo)/.test(lower)) cfm = n * 2.11888;
            else if (/(l\/min|l\s*min|litros\/min|litros por minuto)/.test(lower)) cfm = n * 0.0353147;
            else if (/(m3\/h|m³\/h|metros\s*cúbicos\/hora)/.test(lower)) cfm = n * 0.588577;
            // SCFM/CFM default treated as CFM numeric
            return Math.round(cfm * 100) / 100;
        })(),
        rated_flow_cfm_indice_mongo: (() => {
            const applicable = new Set(['AIR','AIR DRYER']);
            if (!applicable.has(familyPrefix)) return undefined;
            const raw = (
                attrs.rated_flow_cfm ||
                attrs.flow_rate ||
                attrs.rated_cfm ||
                attrs.scfm ||
                attrs['Flow Rate'] ||
                attrs['Rated CFM'] ||
                attrs['SCFM'] ||
                attrs['Caudal de Aire'] ||
                attrs['Caudal de Aire Nominal'] ||
                attrs['m3/min'] ||
                attrs['m³/min'] ||
                attrs['L/s'] ||
                attrs['l/s'] ||
                attrs['L/min'] ||
                attrs['l/min'] ||
                attrs['CFM'] ||
                ''
            );
            const s = String(raw).trim();
            if (!s) return undefined;
            const lower = s.toLowerCase().replace(/,/g, '.');
            const numMatch = lower.match(/([0-9]+(?:\.[0-9]+)?)/);
            if (!numMatch) return undefined;
            const n = parseFloat(numMatch[1]);
            if (isNaN(n) || n <= 0) return undefined;
            let cfm = n;
            if (/(m3\/min|m³\/min)/.test(lower)) cfm = n * 35.315;
            else if (/(l\/s|l\s*s|litros\/seg|litros por segundo)/.test(lower)) cfm = n * 2.11888;
            else if (/(l\/min|l\s*min|litros\/min|litros por minuto)/.test(lower)) cfm = n * 0.0353147;
            else if (/(m3\/h|m³\/h|metros\s*cúbicos\/hora)/.test(lower)) cfm = n * 0.588577;
            return Math.round(cfm * 100) / 100;
        })(),
        rated_flow_air_quality_flag: (() => {
            const applicable = new Set(['AIR','AIR DRYER']);
            if (!applicable.has(familyPrefix)) return '';
            const raw = (
                attrs.rated_flow_cfm ||
                attrs.flow_rate ||
                attrs.rated_cfm ||
                attrs.scfm ||
                attrs['Flow Rate'] ||
                attrs['Rated CFM'] ||
                attrs['SCFM'] ||
                attrs['Caudal de Aire'] ||
                attrs['Caudal de Aire Nominal'] ||
                attrs['m3/min'] ||
                attrs['m³/min'] ||
                attrs['L/s'] ||
                attrs['l/s'] ||
                attrs['L/min'] ||
                attrs['l/min'] ||
                attrs['CFM'] ||
                ''
            );
            const s = String(raw).trim();
            const lower = s.toLowerCase().replace(/,/g, '.');
            const numMatch = lower.match(/([0-9]+(?:\.[0-9]+)?)/);
            const hasValue = !!numMatch && parseFloat(numMatch[1]) > 0;
            if (!hasValue) return '⚠️ Falta Flujo Nominal de Aire (CFM).';
            const mediaRaw = (
                attrs.media_type ||
                attrs.media ||
                attrs.technology ||
                attrs['tecnología'] ||
                attrs['medio filtrante'] ||
                attrs.medio_filtrante ||
                attrs.description ||
                ''
            );
            const media = String(mediaRaw).toLowerCase();
            let cfm = (() => {
                const n = parseFloat(numMatch[1]);
                if (isNaN(n) || n <= 0) return NaN;
                let v = n;
                if (/(m3\/min|m³\/min)/.test(lower)) v = n * 35.315;
                else if (/(l\/s|l\s*s|litros\/seg|litros por segundo)/.test(lower)) v = n * 2.11888;
                else if (/(l\/min|l\s*min|litros\/min|litros por minuto)/.test(lower)) v = n * 0.0353147;
                else if (/(m3\/h|m³\/h|metros\s*cúbicos\/hora)/.test(lower)) v = n * 0.588577;
                return v;
            })();
            const isMacrocore = media.includes('macrocore');
            if (!isNaN(cfm) && isMacrocore && cfm < 250) {
                return '⚠️ Flujo de Aire bajo para MACROCORE™.';
            }
            return '';
        })(),
        operating_pressure_min_psi: (() => {
            const applicable = new Set(['HYDRAULIC','FUEL']);
            if (!applicable.has(familyPrefix)) return '';
            const raw = (
                attrs.operating_pressure_min_psi ||
                attrs.min_operating_pressure ||
                attrs.low_pressure_rating ||
                attrs['Min Operating Pressure'] ||
                attrs['Low Pressure Rating'] ||
                attrs['Presión Mínima de Operación'] ||
                attrs['Presión Mín'] ||
                attrs['kPa'] ||
                attrs['bar'] ||
                attrs['Bar'] ||
                attrs['PSI'] ||
                ''
            );
            const s = String(raw).trim();
            if (!s) return '';
            const lower = s.toLowerCase().replace(/,/g, '.');
            const numMatch = lower.match(/([0-9]+(?:\.[0-9]+)?)/);
            if (!numMatch) return '';
            const n = parseFloat(numMatch[1]);
            if (isNaN(n)) return '';
            let psi = n;
            if (/(mpa)/.test(lower)) psi = n * 145.038;
            else if (/(bar)/.test(lower)) psi = n * 14.5;
            else if (/(kpa)/.test(lower)) psi = n * 0.145038;
            else if (/(pa)/.test(lower)) psi = n * 0.000145038;
            // default assumes PSI
            return Math.round(psi * 100) / 100;
        })(),
        operating_pressure_min_psi_indice_mongo: (() => {
            const applicable = new Set(['HYDRAULIC','FUEL']);
            if (!applicable.has(familyPrefix)) return undefined;
            const raw = (
                attrs.operating_pressure_min_psi ||
                attrs.min_operating_pressure ||
                attrs.low_pressure_rating ||
                attrs['Min Operating Pressure'] ||
                attrs['Low Pressure Rating'] ||
                attrs['Presión Mínima de Operación'] ||
                attrs['Presión Mín'] ||
                attrs['kPa'] ||
                attrs['bar'] ||
                attrs['Bar'] ||
                attrs['PSI'] ||
                ''
            );
            const s = String(raw).trim();
            if (!s) return undefined;
            const lower = s.toLowerCase().replace(/,/g, '.');
            const numMatch = lower.match(/([0-9]+(?:\.[0-9]+)?)/);
            if (!numMatch) return undefined;
            const n = parseFloat(numMatch[1]);
            if (isNaN(n)) return undefined;
            let psi = n;
            if (/(mpa)/.test(lower)) psi = n * 145.038;
            else if (/(bar)/.test(lower)) psi = n * 14.5;
            else if (/(kpa)/.test(lower)) psi = n * 0.145038;
            else if (/(pa)/.test(lower)) psi = n * 0.000145038;
            return Math.round(psi * 100) / 100;
        })(),
        operating_pressure_min_quality_flag: (() => {
            const applicable = new Set(['HYDRAULIC','FUEL']);
            if (!applicable.has(familyPrefix)) return '';
            const raw = (
                attrs.operating_pressure_min_psi ||
                attrs.min_operating_pressure ||
                attrs.low_pressure_rating ||
                attrs['Min Operating Pressure'] ||
                attrs['Low Pressure Rating'] ||
                attrs['Presión Mínima de Operación'] ||
                attrs['Presión Mín'] ||
                attrs['kPa'] ||
                attrs['bar'] ||
                attrs['Bar'] ||
                attrs['PSI'] ||
                ''
            );
            const s = String(raw).trim();
            const lower = s.toLowerCase().replace(/,/g, '.');
            const numMatch = lower.match(/([0-9]+(?:\.[0-9]+)?)/);
            const hasValue = !!numMatch && parseFloat(numMatch[1]) >= 0;
            if (!hasValue) return '⚠️ Falta Presión Mínima de Operación (PSI).';
            // Coherencia con bypass: la presión mínima no debe ser >= bypass
            const bypassRaw = (
                attrs.bypass_valve_psi ||
                attrs.bypass_valve_setting ||
                attrs.bypass ||
                attrs['Bypass Valve'] ||
                attrs['Válvula Bypass'] ||
                ''
            );
            const bypassStr = String(bypassRaw || '').toLowerCase().replace(/,/g, '.');
            const bypassMatch = bypassStr.match(/([0-9]+(?:\.[0-9]+)?)/);
            let bypassPsi = NaN;
            if (bypassMatch) {
                const bv = parseFloat(bypassMatch[1]);
                if (!isNaN(bv)) bypassPsi = bv;
            }
            let minPsi = (() => {
                const n = parseFloat(numMatch[1]);
                if (isNaN(n)) return NaN;
                let v = n;
                if (/(mpa)/.test(lower)) v = n * 145.038;
                else if (/(bar)/.test(lower)) v = n * 14.5;
                else if (/(kpa)/.test(lower)) v = n * 0.145038;
                else if (/(pa)/.test(lower)) v = n * 0.000145038;
                return v;
            })();
            if (!isNaN(minPsi) && !isNaN(bypassPsi) && minPsi >= bypassPsi) {
                return '⚠️ Presión mínima ≥ bypass; revisar coherencia.';
            }
            return '';
        })(),
        operating_pressure_max_psi: (() => {
            const applicable = new Set(['HYDRAULIC','FUEL','OIL']);
            if (!applicable.has(familyPrefix)) return '';
            const raw = (
                attrs.operating_pressure_max_psi ||
                attrs.max_operating_pressure ||
                attrs.rated_pressure ||
                attrs['Max Operating Pressure'] ||
                attrs['Rated Pressure'] ||
                attrs['Presión Máxima de Operación'] ||
                attrs['Presión Máx'] ||
                attrs['kPa'] ||
                attrs['bar'] ||
                attrs['Bar'] ||
                attrs['MPa'] ||
                attrs['PSI'] ||
                ''
            );
            const s = String(raw).trim();
            if (!s) return '';
            const lower = s.toLowerCase().replace(/,/g, '.');
            const numMatch = lower.match(/([0-9]+(?:\.[0-9]+)?)/);
            if (!numMatch) return '';
            const n = parseFloat(numMatch[1]);
            if (isNaN(n)) return '';
            let psi = n;
            if (/(mpa)/.test(lower)) psi = n * 145.038;
            else if (/(bar)/.test(lower)) psi = n * 14.5;
            else if (/(kpa)/.test(lower)) psi = n * 0.145038;
            else if (/(pa)/.test(lower)) psi = n * 0.000145038;
            return Math.round(psi * 100) / 100;
        })(),
        operating_pressure_max_psi_indice_mongo: (() => {
            const applicable = new Set(['HYDRAULIC','FUEL','OIL']);
            if (!applicable.has(familyPrefix)) return undefined;
            const raw = (
                attrs.operating_pressure_max_psi ||
                attrs.max_operating_pressure ||
                attrs.rated_pressure ||
                attrs['Max Operating Pressure'] ||
                attrs['Rated Pressure'] ||
                attrs['Presión Máxima de Operación'] ||
                attrs['Presión Máx'] ||
                attrs['kPa'] ||
                attrs['bar'] ||
                attrs['Bar'] ||
                attrs['MPa'] ||
                attrs['PSI'] ||
                ''
            );
            const s = String(raw).trim();
            if (!s) return undefined;
            const lower = s.toLowerCase().replace(/,/g, '.');
            const numMatch = lower.match(/([0-9]+(?:\.[0-9]+)?)/);
            if (!numMatch) return undefined;
            const n = parseFloat(numMatch[1]);
            if (isNaN(n)) return undefined;
            let psi = n;
            if (/(mpa)/.test(lower)) psi = n * 145.038;
            else if (/(bar)/.test(lower)) psi = n * 14.5;
            else if (/(kpa)/.test(lower)) psi = n * 0.145038;
            else if (/(pa)/.test(lower)) psi = n * 0.000145038;
            return Math.round(psi * 100) / 100;
        })(),
        operating_pressure_max_quality_flag: (() => {
            const applicable = new Set(['HYDRAULIC','FUEL','OIL']);
            if (!applicable.has(familyPrefix)) return '';
            const raw = (
                attrs.operating_pressure_max_psi ||
                attrs.max_operating_pressure ||
                attrs.rated_pressure ||
                attrs['Max Operating Pressure'] ||
                attrs['Rated Pressure'] ||
                attrs['Presión Máxima de Operación'] ||
                attrs['Presión Máx'] ||
                attrs['kPa'] ||
                attrs['bar'] ||
                attrs['Bar'] ||
                attrs['MPa'] ||
                attrs['PSI'] ||
                ''
            );
            const s = String(raw).trim();
            const lower = s.toLowerCase().replace(/,/g, '.');
            const numMatch = lower.match(/([0-9]+(?:\.[0-9]+)?)/);
            const hasValue = !!numMatch && !isNaN(parseFloat(numMatch[1]));
            if (!hasValue) return '⚠️ Falta Presión Máxima de Operación (PSI).';
            // Coherencia con Burst: max debe ser < burst
            const burstRaw = (
                attrs.hydrostatic_burst_psi ||
                attrs.hydrostatic_burst ||
                attrs.burst_pressure ||
                attrs['Hydrostatic Burst'] ||
                attrs['Burst Pressure'] ||
                attrs['Presión de Estallido'] ||
                ''
            );
            const burstStr = String(burstRaw || '').toLowerCase().replace(/,/g, '.');
            const burstMatch = burstStr.match(/([0-9]+(?:\.[0-9]+)?)/);
            let burstPsi = NaN;
            if (burstMatch) {
                const bn = parseFloat(burstMatch[1]);
                if (!isNaN(bn)) {
                    let v = bn;
                    if (/(mpa)/.test(burstStr)) v = bn * 145.038;
                    else if (/(bar)/.test(burstStr)) v = bn * 14.5;
                    else if (/(kpa)/.test(burstStr)) v = bn * 0.145038;
                    else if (/(pa)/.test(burstStr)) v = bn * 0.000145038;
                    burstPsi = v;
                }
            }
            let maxPsi = (() => {
                const n = parseFloat(numMatch[1]);
                if (isNaN(n)) return NaN;
                let v = n;
                if (/(mpa)/.test(lower)) v = n * 145.038;
                else if (/(bar)/.test(lower)) v = n * 14.5;
                else if (/(kpa)/.test(lower)) v = n * 0.145038;
                else if (/(pa)/.test(lower)) v = n * 0.000145038;
                return v;
            })();
            if (!isNaN(maxPsi) && !isNaN(burstPsi)) {
                if (maxPsi >= burstPsi) return '⚠️ Presión Máxima ≥ Estallido; incoherente.';
                if (maxPsi > burstPsi * 0.7) return '⚠️ Presión Máxima muy cercana a Estallido; factor de seguridad bajo.';
            }
            // Heurística por prefijo: HYDRAULIC suele tener valores altos
            if (familyPrefix === 'HYDRAULIC' && !isNaN(maxPsi) && maxPsi < 500) {
                return '⚠️ Presión Máxima baja para HYDRAULIC; revisar especificación.';
            }
            return '';
        })(),
        beta_200_indice_mongo: (() => {
            const applicable = new Set(['OIL','FUEL','HYDRAULIC']);
            if (!applicable.has(familyPrefix)) return undefined;
            const raw = (
                attrs.beta_200 ||
                attrs.beta_ratio ||
                attrs.beta_value ||
                attrs['beta 200'] ||
                attrs['beta200'] ||
                attrs['β200'] ||
                attrs.beta ||
                ''
            );
            const val = normalizeBetaRatio(raw);
            return isNaN(val) || val <= 0 ? undefined : Number(val);
        })(),
        beta_200_quality_flag: (() => {
            const applicable = new Set(['OIL','FUEL','HYDRAULIC']);
            if (!applicable.has(familyPrefix)) return '';
            const raw = (
                attrs.beta_200 ||
                attrs.beta_ratio ||
                attrs.beta_value ||
                attrs['beta 200'] ||
                attrs['beta200'] ||
                attrs['β200'] ||
                attrs.beta ||
                ''
            );
            const val = normalizeBetaRatio(raw);
            if (isNaN(val) || val <= 0) return '⚠️ Falta Beta 200 (mandatorio en filtros de fase líquida).';
            const highEfficiencyLine = /ULTRA|SYNTHETIC/i.test(String(lineSuffix || ''));
            if (highEfficiencyLine && val < 75) return '⚠️ Beta bajo para línea ULTRA/SYNTHETIC (<75).';
            return '';
        })(),
        gasket_od_mm_indice_mongo: (() => {
            const liquidFamilies = new Set(['OIL','FUEL','HYDRAULIC','COOLANT']);
            if (!liquidFamilies.has(familyPrefix)) return undefined;
            if (!isSpinOnDesign) return undefined;
            const valStr = normalizeMM(
                attrs.gasket_od_mm ||
                attrs.gasket_od ||
                attrs['gasket od'] ||
                attrs.seal_od ||
                attrs['seal od'] ||
                attrs.gasket_outer_diameter ||
                attrs['gasket outer diameter'] ||
                attrs.diametro_exterior_junta ||
                attrs['diámetro exterior junta'] ||
                attrs['diámetro exterior de junta'] ||
                ''
            );
            const val = parseFloat(valStr || '');
            return isNaN(val) ? undefined : Number(val.toFixed(2));
        })(),
        gasket_od_quality_flag: (() => {
            const liquidFamilies = new Set(['OIL','FUEL','HYDRAULIC','COOLANT']);
            if (!liquidFamilies.has(familyPrefix)) return '';
            if (!isSpinOnDesign) return '';
            const gasketStr = normalizeMM(
                attrs.gasket_od_mm ||
                attrs.gasket_od ||
                attrs['gasket od'] ||
                attrs.seal_od ||
                attrs['seal od'] ||
                attrs.gasket_outer_diameter ||
                attrs['gasket outer diameter'] ||
                attrs.diametro_exterior_junta ||
                attrs['diámetro exterior junta'] ||
                attrs['diámetro exterior de junta'] ||
                ''
            );
            const gasketVal = parseFloat(gasketStr || '');
            if (isNaN(gasketVal)) return '⚠️ Falta Gasket OD para diseño spin-on en familia líquida.';
            // Compare against outer diameter
            const odStr = normalizeMM(
                attrs.outer_diameter_mm ||
                attrs.outer_diameter ||
                attrs.major_diameter ||
                attrs['outer diameter'] ||
                attrs['major diameter'] ||
                attrs.od ||
                attrs['od'] ||
                ''
            );
            const od = parseFloat(odStr || '');
            if (!isNaN(od) && gasketVal >= od) return '⚠️ Gasket OD debe ser menor que el diámetro exterior.';
            // Compare against thread major diameter
            const rawThread = (
                attrs.thread_size ||
                attrs.thread ||
                attrs['thread size'] ||
                attrs.tpi ||
                attrs.threads_per_inch ||
                attrs.rosca ||
                attrs.roscado ||
                ''
            );
            const threadMajor = extractThreadMajorDiameterMM(rawThread);
            if (!isNaN(threadMajor) && gasketVal <= threadMajor) {
                return '⚠️ Gasket OD debe ser mayor que el diámetro de rosca.';
            }
            return '';
        })(),
        gasket_id_mm_indice_mongo: (() => {
            const liquidFamilies = new Set(['OIL','FUEL','HYDRAULIC','COOLANT']);
            if (!liquidFamilies.has(familyPrefix)) return undefined;
            if (!isSpinOnDesign) return undefined;
            const valStr = normalizeMM(
                attrs.gasket_id_mm ||
                attrs.gasket_id ||
                attrs['gasket id'] ||
                attrs.seal_id ||
                attrs['seal id'] ||
                attrs.gasket_inner_diameter ||
                attrs['gasket inner diameter'] ||
                attrs.diametro_interior_junta ||
                attrs['diámetro interior junta'] ||
                attrs['diámetro interior de junta'] ||
                ''
            );
            const val = parseFloat(valStr || '');
            return isNaN(val) ? undefined : Number(val.toFixed(2));
        })(),
        gasket_id_quality_flag: (() => {
            const liquidFamilies = new Set(['OIL','FUEL','HYDRAULIC','COOLANT']);
            if (!liquidFamilies.has(familyPrefix)) return '';
            if (!isSpinOnDesign) return '';
            const tol = 0.5;
            const idStr = normalizeMM(
                attrs.gasket_id_mm ||
                attrs.gasket_id ||
                attrs['gasket id'] ||
                attrs.seal_id ||
                attrs['seal id'] ||
                attrs.gasket_inner_diameter ||
                attrs['gasket inner diameter'] ||
                attrs.diametro_interior_junta ||
                attrs['diámetro interior junta'] ||
                attrs['diámetro interior de junta'] ||
                ''
            );
            const idVal = parseFloat(idStr || '');
            if (isNaN(idVal)) return '⚠️ Falta Gasket ID para diseño spin-on en familia líquida.';
            const odStr = normalizeMM(
                attrs.gasket_od_mm ||
                attrs.gasket_od ||
                attrs['gasket od'] ||
                attrs.seal_od ||
                attrs['seal od'] ||
                attrs.gasket_outer_diameter ||
                attrs['gasket outer diameter'] ||
                attrs.diametro_exterior_junta ||
                attrs['diámetro exterior junta'] ||
                attrs['diámetro exterior de junta'] ||
                ''
            );
            const odVal = parseFloat(odStr || '');
            if (!isNaN(odVal) && idVal >= odVal) return '⚠️ Gasket ID debe ser menor que Gasket OD.';
            const rawThread = (
                attrs.thread_size ||
                attrs.thread ||
                attrs['thread size'] ||
                attrs.tpi ||
                attrs.threads_per_inch ||
                attrs.rosca ||
                attrs.roscado ||
                ''
            );
            const threadMajor = extractThreadMajorDiameterMM(rawThread);
            if (!isNaN(threadMajor) && idVal + tol < threadMajor) {
                return '⚠️ Gasket ID debe ser mayor o muy cercano al diámetro de rosca.';
            }
            return '';
        })(),
        thread_size_indice_mongo: (() => {
            const rawThread = (
                attrs.thread_size ||
                attrs.thread ||
                attrs['thread size'] ||
                attrs.tpi ||
                attrs.threads_per_inch ||
                attrs.rosca ||
                attrs.roscado ||
                ''
            );
            const norm = normalizeThreadSize(rawThread);
            const liquidFamilies = new Set(['OIL','FUEL','COOLANT','HYDRAULIC']);
            if (!liquidFamilies.has(familyPrefix)) return undefined;
            if (familyPrefix === 'AIR' || familyPrefix === 'CABIN') return undefined;
            if (!isSpinOnDesign && !norm) return undefined;
            return norm || undefined;
        })()
    };
}

/**
 * Append single filter to Google Sheets Master
 * @param {object} data - Filter data to append
 */
async function appendToSheet(data) {
    try {
        const doc = await initSheet();
        const sheet = doc.sheetsByIndex[0];
        await ensureHeaders(sheet);
        const rowData = buildRowData(data);
        await sheet.addRow(rowData);
        console.log(`💾 Saved to Google Sheet Master: ${data.sku}`);
    } catch (error) {
        console.error('❌ Error appending to Google Sheet:', error.message);
        throw error;
    }
}

/**
 * Upsert by SKU: replace existing row(s) for the SKU or insert new
 * @param {object} data - Filter data to upsert
 * @param {object} options - { deleteDuplicates?: boolean }
 */
async function upsertBySku(data, options = { deleteDuplicates: true }) {
    try {
        const doc = await initSheet();
        const sheet = doc.sheetsByIndex[0];
        await ensureHeaders(sheet);
        const rows = await sheet.getRows();
        const skuNorm = (data.sku || '').toUpperCase().trim();
        // Some environments expose row values directly by header name, avoiding row.get()
        const matches = rows.filter(r => (r.sku || '').toUpperCase().trim() === skuNorm);

        const rowData = buildRowData(data);

        if (matches.length > 0) {
            const row = matches[0];
            // Assign all fields
            Object.entries(rowData).forEach(([k, v]) => { row[k] = v; });
            await row.save();
            console.log(`♻️ Upserted existing row for ${data.sku}`);

            if (options.deleteDuplicates && matches.length > 1) {
                for (let i = 1; i < matches.length; i++) {
                    try {
                        await matches[i].delete();
                        console.log(`🧹 Deleted duplicate row for ${data.sku}`);
                    } catch (e) {
                        console.warn(`⚠️ Failed to delete duplicate for ${data.sku}: ${e.message}`);
                    }
                }
            }
        } else {
            await sheet.addRow(rowData);
            console.log(`➕ Inserted new row for ${data.sku}`);
        }
    } catch (error) {
        console.error('❌ Error upserting to Google Sheet:', error.message);
        throw error;
    }
}

/**
 * Sync MongoDB to Google Sheets (if needed)
 */
async function syncToSheets(filters) {
    try {
        console.log('🔄 Starting sync to Google Sheets Master...');

        if (!filters || filters.length === 0) {
            console.log('⚠️  No filters to sync');
            return { success: false, message: 'No filters provided' };
        }

        const doc = await initSheet();
        const sheet = doc.sheetsByIndex[0];
        await ensureHeaders(sheet);

        console.log(`📊 Syncing ${filters.length} filters...`);

        for (const filter of filters) {
            await upsertBySku(filter);
        }

        console.log(`✅ Sync complete: ${filters.length} filters synced`);
        
        return {
            success: true,
            synced: filters.length,
            message: `Successfully synced ${filters.length} filters`
        };

    } catch (error) {
        console.error('❌ Sync error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// ============================================================================
// UTILITIES
// ============================================================================

function tryParseJSON(str) {
    try {
        return JSON.parse(str);
    } catch {
        return str || [];
    }
}

// ============================================================================
// HEALTH / PING
// ============================================================================

async function pingSheets() {
    try {
        const doc = await initSheet();
        const sheetsCount = (doc.sheetsByIndex || []).length;
        const title = doc.title || 'Unknown';
        return { ok: true, title, sheetsCount };
    } catch (error) {
        return { ok: false, error: error.message };
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    searchInSheet,
    appendToSheet,
    upsertBySku,
    syncToSheets,
    // Export interno para pruebas y validaciones locales
    buildRowData,
    pingSheets
};
