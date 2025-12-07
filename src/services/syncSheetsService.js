// ============================================================================
// GOOGLE SHEETS SYNC SERVICE - FINAL
// Google Sheet Master: 1ZYI5c0enkuvWAveu8HMaCUk1cek_VDrX8GtgKW7VP6U
// ============================================================================

const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
// Load env locally; attempt parent resolution if needed
try { require('dotenv').config(); } catch (_) { }
const path = require('path');
if (!process.env.GOOGLE_CREDENTIALS && !process.env.GOOGLE_PRIVATE_KEY) {
    try {
        const altEnvPath = path.join(__dirname, '../../../.env');
        require('dotenv').config({ path: altEnvPath });
        if (process.env.GOOGLE_CREDENTIALS || process.env.GOOGLE_PRIVATE_KEY) {
            console.log('ðŸ”§ Loaded env from parent .env');
        }
    } catch (_) { }
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const SHEET_ID = process.env.GOOGLE_SHEETS_ID || '1ZYI5c0enkuvWAveu8HMaCUk1cek_VDrX8GtgKW7VP6U';
// Multi-sheet support for Kits EK5
const KIT_SHEET_NAME = process.env.KITS_SHEET_NAME || 'KITS_EK5';
const KIT_HEADERS = [
    'SKU',
    'Tipo de Producto',
    'Contenido del Kit',
    'Tecnología',
    'Filtro Principal (Ref)',
    'Duty'
];
// KITS_EK3 sheet name (LD)
const KIT_EK3_SHEET_NAME = process.env.KITS_EK3_SHEET_NAME || 'KITS_EK3';

// Column mapping (new exact headers from Sheet Master)
const COLUMNS = {
    QUERY: 'query',
    NORMSKU: 'normsku',
    DUTY_TYPE: 'duty_type',
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
    CHANGE_INTERVAL_KM: 'change_interval_km',
    TECNOLOGIA_APLICADA: 'tecnologia_aplicada'
};

// Desired header order in the Google Sheet (canonical, compatible with search/upsert)
const DESIRED_HEADERS = [
    'query',
    'normsku',
    'duty_type',
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
    'change_interval_km',
    'tecnologia_aplicada',
    'technology_name',
    'technology_tier',
    'technology_scope',
    'technology_equivalents',
    'technology_oem_detected'
];

// ----------------------------------------------------------------------------
// Fallback de temperaturas (configurable por entorno)
// ----------------------------------------------------------------------------
const FALLBACK_TEMP_ENABLED = String(process.env.FALLBACK_TEMP_ENABLED || 'false').toLowerCase() === 'true';
// Estimación pública de dimensiones (opcional) para desbloquear validación esencial
const PUBLIC_DIM_ESTIMATE_ENABLED = String(process.env.PUBLIC_DIM_ESTIMATE_ENABLED || 'true').toLowerCase() === 'true';
const AIR_EST_HD_HEIGHT_MM = parseFloat(process.env.AIR_EST_HD_HEIGHT_MM || '160');
const AIR_EST_HD_OD_MM = parseFloat(process.env.AIR_EST_HD_OD_MM || '120');
const AIR_EST_LD_HEIGHT_MM = parseFloat(process.env.AIR_EST_LD_HEIGHT_MM || '150');
const AIR_EST_LD_OD_MM = parseFloat(process.env.AIR_EST_LD_OD_MM || '110');
const FALLBACK_TEMP_MIN_C = parseFloat(process.env.FALLBACK_TEMP_MIN_C || '-40'); // estándar de marca (-30/-40)
const FALLBACK_TEMP_MAX_NITRILE_C = parseFloat(process.env.FALLBACK_TEMP_MAX_NITRILE_C || '135'); // +120/+135
const FALLBACK_TEMP_MAX_VITON_C = parseFloat(process.env.FALLBACK_TEMP_MAX_VITON_C || '200');
// Lista de SKUs excluidos de fallbacks de temperatura (mantener null/vacío)
const FALLBACK_TEMP_SKU_EXCLUDE_LIST = String(process.env.FALLBACK_TEMP_SKU_EXCLUDE_LIST || '')
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean);

// ============================================================================
// Descripciones ELIMFILTERS - Diccionario (Prefijo + LÃ­nea)
// ============================================================================
const STOP_WORDS = [
    'AIRE', 'AIR', 'OIL', 'ACEITE', 'FUEL', 'COMBUSTIBLE', 'CABINA', 'CABIN',
    'LUBE', 'ELEMENTO', 'FILTRO'
];

const DESCRIPCIONES_ELIMFILTERS = {
    AIR_PRECISION: 'FiltraciÃ³n MACROCOREâ„¢ PRECISION para LD con alta eficiencia y flujo estable. Medio Filtrante Genuino. Desarrollado con IA.',
    AIR_INDUSTRIAL: 'ProtecciÃ³n MACROCOREâ„¢ INDUSTRIAL para HD con nanofibra OptiFlowâ„¢ en entornos severos y elementos de seguridad. Medio Filtrante Genuino. Desarrollado con IA.',
    OIL_SYNTHETIC: 'ELIMTEKâ„¢ SYNTHETIC: Medio sintÃ©tico de precisiÃ³n 99% @ 20Âµ para HD y series XG con performance extendido. Medio Filtrante Genuino. Desarrollado con IA.',
    OIL_ADVANCED: 'ELIMTEKâ„¢ ADVANCED: Celulosa blend reforzada 97% @ 25Âµ, Ã³ptimo para LD y series TG/HM. Balance entre eficiencia y capacidad. Medio Filtrante Genuino. Desarrollado con IA.',
    FUEL_ULTRA: 'ELIMTEKâ„¢ ULTRA: Multi-capa 99.5% @ 4Âµ con separaciÃ³n de agua >95% para HD/PS-series en sistemas diÃ©sel exigentes. Medio Filtrante Genuino. Desarrollado con IA.',
    FUEL_ADVANCED: 'ELIMTEKâ„¢ ADVANCED: FiltraciÃ³n de combustible LD con blend reforzada, eficiencia y costo optimizados. Medio Filtrante Genuino. Desarrollado con IA.',
    CABIN_PREMIUM: 'MICROKAPPAâ„¢ PREMIUM: CarbÃ³n activado y sistema multietapa para purificaciÃ³n avanzada del habitÃ¡culo. Medio Filtrante Genuino. Desarrollado con IA.',
    CABIN_PURE: 'MICROKAPPAâ„¢ PURE: ElectrostÃ¡tico multi-capa de alta eficiencia para aire de cabina estÃ¡ndar. Medio Filtrante Genuino. Desarrollado con IA.',
    HYDRAULIC_ULTRA: 'ELIMTEKâ„¢ ULTRA: FiltraciÃ³n hidrÃ¡ulica de alta presiÃ³n con nano-fibra multi-capa en lÃ­neas de presiÃ³n/retorno. Medio Filtrante Genuino. Desarrollado con IA.',
    COOLANT_SYNTHETIC: 'ELIMTEKâ„¢ SYNTHETIC: Control de refrigerante con medio sintÃ©tico de precisiÃ³n, compatible con sistemas con o sin aditivos SCA. Medio Filtrante Genuino. Desarrollado con IA.',
    AIR_DRYER_ULTRA: 'ELIMTEKâ„¢ ULTRA: Cartucho secador de aire con desecante de alto desempeÃ±o para aire comprimido y sistemas de frenado. Medio Filtrante Genuino. Desarrollado con IA.',
    MARINE_ULTRA: 'ELIMTEKâ„¢ ULTRA: FiltraciÃ³n marina Heavy Duty, separaciÃ³n agua/combustible y protecciÃ³n crÃ­tica de motores. Medio Filtrante Genuino. Desarrollado con IA.'
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

// Medias y lÃ­neas desde util de producto (especificaciÃ³n: usar mediaMapper.js)
const { getMedia: getProductMedia } = require('../utils/mediaMapper');
const { getTechnology: getProductTechnology } = require('../utils/elimfiltersTechnologies');
const { normalizeTechnology } = require('../utils/technologyNormalizer');
const { resolveSubtype } = require('../utils/subtypeResolver');

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
        console.log(`ðŸ“Š Google Sheet Master loaded: ${doc.title}`);
        return doc;

    } catch (error) {
        console.error('âŒ Error initializing Google Sheet:', error.message);
        throw error;
    }
}

// ============================================================================
// KITS (EK5) - Multi-sheet helpers
// ============================================================================

async function ensureSheetExists(sheetName, headers) {
    const doc = await initSheet();
    let sheet = (doc.sheetsByTitle && doc.sheetsByTitle[sheetName]) || null;
    if (!sheet) {
        sheet = await doc.addSheet({ title: sheetName, headerValues: headers });
        console.log(`➕ Created sheet '${sheetName}' with headers`);
    } else {
        // Ensure headers are set exactly as provided
        try {
            await sheet.setHeaderRow(headers);
        } catch (_) {
            // Fallback: ignore header setting errors silently
        }
    }
    return { doc, sheet };
}

/**
 * Upsert a row into a specific sheet by key 'SKU'.
 * - If targetSheetName equals KIT_SHEET_NAME, uses KIT_HEADERS.
 * - Defaults to Master sheet when targetSheetName is not provided.
 * @param {object} rowData - Object with keys matching sheet headers
 * @param {string} [targetSheetName] - Sheet title to write into
 */
async function upsertRow(rowData, targetSheetName) {
    const name = targetSheetName || null;

    // If a target sheet name is provided (e.g., KITS_EK5 or KITS_EK3), perform sheet-specific upsert by 'SKU'
    if (name) {
        const headers = KIT_HEADERS; // Both EK5 and EK3 share the same column layout
        const { sheet } = await ensureSheetExists(name, headers);
        const rows = await sheet.getRows();
        const skuUpper = String(rowData['SKU'] || '').trim().toUpperCase();
        const matches = rows.filter(r => String(r['SKU'] || '').trim().toUpperCase() === skuUpper);

        if (matches.length > 0) {
            const row = matches[0];
            Object.entries(rowData).forEach(([k, v]) => { row[k] = v; });
            await row.save();
            // Delete duplicates if any
            for (let i = 1; i < matches.length; i++) {
                try { await matches[i].delete(); } catch (_) { }
            }
            console.log(`☑️ Upserted kit row in '${name}' for ${rowData['SKU']}`);
        } else {
            await sheet.addRow(rowData);
            console.log(`➕ Inserted kit row in '${name}' for ${rowData['SKU']}`);
        }
        return true;
    }

    // Default: Master sheet upsert using existing flow
    await upsertBySku(rowData);
    return true;
}

/**
 * Save EK5 kit data to the dedicated kits sheet
 * @param {object} kitRowData - { 'SKU', 'Tipo de Producto', 'Contenido del Kit', 'Tecnología', 'Filtro Principal (Ref)', 'Duty' }
 */
async function saveKitToSheet(kitRowData) {
    await ensureSheetExists(KIT_SHEET_NAME, KIT_HEADERS);
    await upsertRow(kitRowData, KIT_SHEET_NAME);
}

/**
 * Save EK3 kit data to the dedicated kits sheet
 * @param {object} kitRowData - row with headers KIT_HEADERS
 */
async function saveKitToSheetLD(kitRowData) {
    await ensureSheetExists(KIT_EK3_SHEET_NAME, KIT_HEADERS);
    await upsertRow(kitRowData, KIT_EK3_SHEET_NAME);
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
            const queryNorm = getCell(row, 'query')?.toUpperCase().replace(/[^A-Z0-9]/g, '');
            const normsku = getCell(row, 'normsku')?.toUpperCase().replace(/[^A-Z0-9]/g, '');

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
                normsku === normalizedCode) {

                console.log(`ðŸ“Š Found in Google Sheet Master: ${code} â†’ ${getCell(row, 'normsku')}`);

                return {
                    found: true,
                    query: getCell(row, 'query'),
                    normsku: getCell(row, 'normsku'),
                    description: getCell(row, 'description'),
                    family: getCell(row, 'family'),
                    duty_type: getCell(row, 'duty_type'),
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
        console.error('âŒ Error searching Google Sheet:', error.message);
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
            console.log('ðŸ§­ Sheet headers updated to new structure');
        }
    } catch (e) {
        console.warn(`âš ï¸ Could not verify/update headers: ${e.message}`);
    }
}

/**
 * Build row data according to exact column structure
 */
function buildRowData(data) {
    // Minimal mode: only write query and normsku, blank all other headers
    if (data && data.minimal === true) {
        const base = {};
        try {
            for (const h of DESIRED_HEADERS) base[h] = '';
        } catch (_) {
            // Fallback in case headers not loaded; set known essentials
            base.query = '';
            base.normsku = '';
        }
        const skuVal = String(data.sku || '').toUpperCase().trim();
        const qn = String(data.query_normalized || skuVal).toUpperCase().replace(/[^A-Z0-9]/g, '');
        base.query = qn;
        base.normsku = skuVal;
        return base;
    }
    const attrs = data.attributes || {};
    // Resolver A–D (duty/type) por prefijo como pista inicial
    let preResolved = {};
    try {
        const { resolveAToD } = require('../utils/aToDResolver');
        preResolved = resolveAToD(data.query_normalized || data.code_input || data.sku || '', {
            duty: data.duty,
            type: data.type || data.filter_type || data.family,
            family: data.family,
            sku: data.sku
        }) || {};
        // No sobreescribir si ya vienen definidos; sólo completar vacíos
        if (!data.duty && preResolved.duty_type) data.duty = preResolved.duty_type;
        if (!data.type && !data.filter_type && !data.family && preResolved.type) {
            data.type = preResolved.type;
        }
    } catch (_) { }
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
    // Helper: format applications [{name, years}] â†’ "Name (Years)"
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
    // Normalize dimension strings like "10.24 inch (260 mm)" â†’ "260"
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
        // Inches â†’ mm (allow 'inch', 'in', or ")
        const inchMatch = s.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:inch|in|\")/i);
        if (inchMatch) {
            const mm = parseFloat(inchMatch[1]) * 25.4;
            if (!isNaN(mm)) return mm.toFixed(2);
        }
        // Centimeters â†’ mm
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
        s = s.replace(/[Â°Âº]/g, '').replace(/,/g, '.');
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
        // MPa â†’ psi (1 MPa â‰ˆ 145.038 psi)
        m = s.match(/([0-9]+(?:\.[0-9]+)?)\s*mpa\b/i);
        if (m) {
            const vmpa = parseFloat(m[1]);
            const psi = vmpa * 145.038;
            return isNaN(psi) ? NaN : psi;
        }
        // bar â†’ psi (1 bar â‰ˆ 14.5 psi)
        m = s.match(/([0-9]+(?:\.[0-9]+)?)\s*bar\b/i);
        if (m) {
            const vbar = parseFloat(m[1]);
            const psi = vbar * 14.5;
            return isNaN(psi) ? NaN : psi;
        }
        // kPa â†’ psi (1 kPa â‰ˆ 0.145 psi)
        m = s.match(/([0-9]+(?:\.[0-9]+)?)\s*kpa\b/i);
        if (m) {
            const vkpa = parseFloat(m[1]);
            const psi = vkpa * 0.145;
            return isNaN(psi) ? NaN : psi;
        }
        // Pa â†’ psi (1 Pa â‰ˆ 0.000145038 psi)
        m = s.match(/([0-9]+(?:\.[0-9]+)?)\s*pa\b/i);
        if (m) {
            const vpa = parseFloat(m[1]);
            const psi = vpa * 0.000145038;
            return isNaN(psi) ? NaN : psi;
        }
        // Range like "12-16" assume first token
        m = s.match(/([0-9]+(?:\.[0-9]+)?)/);
        const tok = m ? parseFloat(m[1]) : NaN;
        return isNaN(tok) ? NaN : tok; // assume PSI if no unit given
    };
    // Normalize Beta ratio (Î²) to numeric value
    const normalizeBetaRatio = (v) => {
        let s = String(v || '').trim();
        if (!s) return NaN;
        // Remove common labels and symbols, unify decimal
        s = s.replace(/[,]/g, '.');
        s = s.replace(/[Î²Î’]/g, 'beta');
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
        s = s.replace(/Ã—/g, 'x').replace(/\s{2,}/g, ' ').trim();
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
        // Already formatted metric like "M20x1.5" â†’ normalize spacing
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
        'Cabina': ['cabin', 'cabin air', 'filtro de cabina', 'habitaculo', 'habitÃ¡culo'],
        'Fuel': ['fuel', 'combustible', 'fuel filter'],
        'Oil': ['oil', 'aceite', 'oil filter'],
        'Fuel Separator': ['separador de agua', 'water separator', 'coalescer', 'coalescente', 'pre filter', 'pre-filter'],
        'Air Dryer': ['air dryer', 'secador de aire', 'desecante aire', 'air desiccant'],
        'Coolant': ['coolant', 'refrigerante', 'coolant filter'],
        'Hidraulic': ['hydraulic', 'hidraulico', 'hidrÃ¡ulico', 'hidraulica', 'hidrÃ¡ulica'],
        'Turbine Series': ['turbine', 'racor turbine series'],
        'Carcazas': ['housing', 'housings', 'carcaza', 'carcazas']
    };

    const SUBTYPE_SYNONYMS = {
        'Spin-On': ['spin on', 'spin-on', 'spinon', 'roscado', 'enroscable'],
        'Cartridge': ['cartridge', 'elemento', 'cartucho'],
        'Panel': ['panel', 'panel filter'],
        'Axial Seal': ['axial seal', 'sello axial'],
        'Radial Seal': ['radial seal', 'sello radial'],
        'Cylindrical': ['cylindrical', 'cilindrico', 'cilÃ­ndrico', 'conico', 'cÃ³nico', 'conico/cylindrical'],
        'Primary': ['primary', 'primario'],
        'Secondary': ['secondary', 'secundario'],
        'In-Line': ['in-line', 'inline', 'en linea', 'en lÃ­nea'],
        'Bypass': ['bypass', 'derivacion', 'derivaciÃ³n'],
        'Full-Flow': ['full flow', 'full-flow', 'flujo total'],
        'High Pressure': ['high pressure', 'alta presion', 'alta presiÃ³n'],
        'Coalescing': ['coalescing', 'coalescente'],
        'Bowl': ['bowl', 'tazon', 'tazÃ³n'],
        'Reusable': ['reusable', 'reutilizable'],
        'Desiccant': ['desiccant', 'desecante'],
        'Standard': ['standard', 'estandar', 'estÃ¡ndar'],
        'High Capacity': ['high capacity', 'alta capacidad'],
        'With Additive/SCA': ['with additive', 'sca', 'con quimica', 'con quÃ­mica'],
        'Blank': ['blank', 'sin quimica', 'sin quÃ­mica'],
        'Suction/In-Tank': ['suction', 'in-tank', 'succion', 'succiÃ³n', 'sumergido'],
        'Pressure': ['pressure', 'presion', 'presiÃ³n'],
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
                examples: 'Radial Seal (Sello Radial), Axial Seal (Sello Axial), Panel, CÃ³nico/Cylindrical (CilÃ­ndrico), Heavy-Duty',
                desc: 'Se refiere a la forma fÃ­sica del filtro principal y su mÃ©todo de sellado.'
            },
            'Cabina': {
                examples: 'Standard, CarbÃ³n Activado (Activated Carbon), Filtro Particulado (Particulate Filter)',
                desc: 'Se refiere al material filtrante utilizado para purificar el aire del habitÃ¡culo.'
            },
            'Fuel': {
                examples: 'Spin-On, Cartridge (Elemento), Primary, Secondary, En LÃ­nea (In-Line)',
                desc: 'Se refiere al diseÃ±o fÃ­sico o a su posiciÃ³n en el sistema (antes o despuÃ©s de la bomba/inyectores).'
            },
            'Oil': {
                examples: 'Spin-On, Cartridge (Elemento), Bypass, Full-Flow, Alta PresiÃ³n',
                desc: 'Se refiere al diseÃ±o fÃ­sico y a la ruta del aceite filtrado (flujo total o parcial).'
            },
            'Fuel Separator': {
                examples: 'Pre-Filter, Coalescing (Coalescente), TazÃ³n (Bowl Type), Reusable (Reutilizable)',
                desc: 'Se refiere a su funciÃ³n principal (separar agua del combustible) y su diseÃ±o (a menudo usado como Primary).'
            },
            'Air Dryer': {
                examples: 'Cartridge, Desecante (Desiccant), Standard, Alta Capacidad',
                desc: 'Elemento que elimina la humedad del aire comprimido en sistemas de frenos de camiones y maquinaria.'
            },
            'Coolant': {
                examples: 'Con QuÃ­mica (With Additive/SCA), Sin QuÃ­mica (Blank), Spin-On',
                desc: 'Indica si el filtro contiene aditivos (SCA) para proteger el sistema de refrigeraciÃ³n.'
            },
            'Hidraulic': {
                examples: 'SucciÃ³n/In-Tank (Sumergido), PresiÃ³n, Retorno (Return), En LÃ­nea (In-Line), Sinterizado',
                desc: 'UbicaciÃ³n en el circuito hidrÃ¡ulico (diferentes puntos de presiÃ³n y flujo).'
            },
            'Turbine Series': {
                examples: 'Filtro Primario, Filtro Secundario, Coalescer, Separador de Agua',
                desc: 'TÃ©rminos internos de la marca Racor (Parker) para clasificar elementos de separaciÃ³n de combustible.'
            },
            'Carcazas': {
                examples: 'Simple, Doble, Modular, Tipo T (T-Type), Tipo L (L-Type), PresiÃ³n Baja/Media/Alta',
                desc: 'DiseÃ±o fÃ­sico del recipiente que alberga el elemento filtrante (donde se instala el filtro).'
            }
        };
        const tpl = templates[canon];
        if (!tpl) return '';
        return `Prefijo (Tipo de Filtro/Componente): ${canon}; Subtipos Comunes (Ejemplos): ${tpl.examples}; DescripciÃ³n Breve: ${tpl.desc}`;
    };
    // Consider Spanish-labeled fields from web technical sheet
    const funcVal = attrs.funcion || attrs['funciÃ³n'] || attrs.function || '';
    const subtypePrincipal = attrs.subtipo_principal || attrs['subtipo principal'] || '';
    const tipoConstruccion = attrs.tipo_construccion || attrs['tipo de construcciÃ³n'] || attrs['tipo_de_construcciÃ³n'] || '';
    const disenoInterno = attrs.diseno_interno || attrs['diseÃ±o interno'] || '';

    let typeValue = attrs.type || data.type || data.filter_type || data.family || preResolved.type || '';
    if (!typeValue) {
        const f = String(funcVal).toLowerCase();
        if (/separador de agua|water separator/.test(f)) typeValue = 'Fuel Separator';
        else if (/cabina|cabin/.test(f)) typeValue = 'Cabina';
        else if (/aire|air/.test(f)) typeValue = 'Aire';
        else if (/aceite|oil/.test(f)) typeValue = 'Oil';
        else if (/fuel|combustible/.test(f)) typeValue = 'Fuel';
        else if (/hidraulic|hidrÃ¡ul|hydraulic/.test(f)) typeValue = 'Hidraulic';
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
    // Derivar PREFIJO_FILTRO (familia canÃ³nica en cÃ³digo)
    const familyPrefixFromCanon = (canon) => {
        switch (canon) {
            case 'Aire': return 'AIR';
            case 'Cabina': return 'CABIN';
            case 'Fuel': return 'FUEL';
            case 'Oil': return 'OIL';
            case 'Coolant': return 'COOLANT';
            case 'Hidraulic': return 'HYDRAULIC';
            case 'Air Dryer': return 'AIR_DRYER';
            case 'Fuel Separator': return 'FUEL SEPARATOR';
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
        // Reglas por familia si el util devolviÃ³ algo genÃ©rico
        const series = detectSeriesFromSku(sku);
        if (familyPrefix === 'AIR') return duty === 'HD' ? 'INDUSTRIAL' : 'PRECISION';
        if (familyPrefix === 'CABIN') return series === 'CF' ? 'PREMIUM' : 'PURE';
        if (familyPrefix === 'OIL') return (duty === 'HD' || series === 'XG') ? 'SYNTHETIC' : 'ADVANCED';
        if (familyPrefix === 'FUEL') return (duty === 'HD' || series === 'PS') ? 'ULTRA' : 'ADVANCED';
        if (familyPrefix === 'FUEL SEPARATOR') return 'ULTRA';
        if (familyPrefix === 'HYDRAULIC') return 'ULTRA';
        if (familyPrefix === 'COOLANT') return 'SYNTHETIC';
        if (familyPrefix === 'AIR_DRYER') return 'ULTRA';
        if (familyPrefix === 'MARINE') return 'ULTRA';
        return 'ADVANCED';
    };

    const familyPrefix = familyPrefixFromCanon(typeCanon);
    const lineSuffix = deriveLineSuffix(familyPrefix, data.duty, data.sku);
    const mappingKey = `${familyPrefix}_${lineSuffix}`;

    // Media Type (columna I): asignaciÃ³n vÃ­a util oficial
    const mediaTypeBase = getProductMedia(familyPrefix);

    // Aplicaciones: derivar categorÃ­a general (columna J) y limpiar lista especÃ­fica (backend y columna K)
    const deriveAplicacionGeneral = (family, duty) => {
        const fam = String(family || '').toUpperCase();
        const d = String(duty || '').toUpperCase();
        if (fam === 'MARINE') return 'Aplicaciones Marinas y NÃ¡uticas';
        if (fam === 'AIR_DRYER') return 'Sistemas de Aire Comprimido y Frenos';
        if (fam === 'TURBINE') return 'Turbinas y GeneraciÃ³n de EnergÃ­a';
        if (fam === 'HYDRAULIC') return 'Maquinaria Pesada y Equipos Industriales';
        // Familias lÃ­quidas y combustible tienden a HD si duty es HD
        if (d === 'HD') return 'Maquinaria Pesada y Equipos Industriales';
        // LD y cabina/aire tienden a vehÃ­culos de pasajeros
        return 'VehÃ­culos de Pasajeros y SUVs';
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
        // Deduplicar manteniendo orden de apariciÃ³n
        const seen = new Set();
        const dedup = [];
        for (const v of out) { if (!seen.has(v)) { seen.add(v); dedup.push(v); } }
        return dedup;
    };

    // Parser detallado de aplicaciones de motor: extrae marca, modelo, aÃ±os y motor
    const parseYears = (s) => {
        const m = String(s || '').match(/\(([^)]+)\)/);
        if (!m) return '';
        const inside = m[1].trim();
        // Validar que parezca rango o aÃ±o
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
        // Buscar desplazamiento tipo "1.7L" o cÃ³digos tipo D722
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
        // Remover parÃ©ntesis y etiquetas de motor para aislar marca + modelo
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
            'HONDA', 'TOYOTA', 'FORD', 'CHEVROLET', 'NISSAN', 'KIA', 'HYUNDAI', 'MAZDA', 'VOLKSWAGEN', 'VW', 'AUDI', 'BMW', 'MERCEDES', 'RENAULT', 'PEUGEOT', 'CITROEN', 'SEAT', 'FIAT', 'SUZUKI', 'SUBARU'
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
        // Dedup por combinaciÃ³n (brand+model+engine+years)
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
        // Ãndice: incluir brand+model, engine y years como tokens
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

    // Descripción scrapeada y fallback generador
    const scrapedDescription = attrs.description || attrs.type || '';
    const isGeneric = (
        !scrapedDescription ||
        String(scrapedDescription).length < 50 ||
        STOP_WORDS.some(w => String(scrapedDescription).toUpperCase().includes(w))
    );
    // Description: prefer scraped text; si es genérica, generar párrafo ELIMFILTERS
    let finalDescription = scrapedDescription;
    if (isGeneric) {
        try {
            const { generateDescription } = require('../utils/descriptionGenerator');
            finalDescription = generateDescription({
                family: familyPrefix,
                duty: data.duty,
                subtype: subtypeDescriptor,
                media_type: mediaTypeBase,
                lang: String(process.env.DEFAULT_LANG || 'es')
            }) || scrapedDescription || '';
        } catch (_) {
            // Mantener scrapedDescription si el generador no está disponible
        }
    }

    // OEM Codes: limpieza y bifurcaciÃ³n
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
    // ClasificaciÃ³n de CR (Aftermarket) por prefijos comunes de marcas de filtros de repuesto
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
    // Subconjunto HD del aftermarket (Donaldson/Fleetguard/Baldwin). Excluye FRAM/Motorcraft/K&N/MANN/MAHLE.
    const HD_AFTERMARKET_PREFIXES = [
        /^(P)[0-9]{4,}$/i,               // Donaldson P series (HD)
        /^(LF|FF|AF|HF|WF)[0-9]+$/i,    // Fleetguard (HD)
        /^(BF|PF|RS|HP|CA|PA)[0-9]+$/i  // Baldwin (HD)
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
    // Recopilar fuentes de cÃ³digos
    const rawOem = Array.isArray(data.oem_codes) ? data.oem_codes : (data.oem_codes ? [data.oem_codes] : (data.code_oem ? [data.code_oem] : []));
    const rawCR = Array.isArray(data.cross_reference) ? data.cross_reference : (data.cross_reference ? [data.cross_reference] : []);

    // Limpiar y clasificar CR visibles
    let cleanedCR = Array.from(new Set(
        rawCR
            .flatMap(v => String(v || '').split(/[;,\s]+/))
            .map(normalizeCode)
            .filter(Boolean)
            .filter(c => isAftermarketCR(c))
    ));
    // Si es HD, limitar referencias cruzadas al sector HD y priorizar homologación Donaldson cuando exista
    const dutyUp = String(data.duty || '').toUpperCase();
    const isHD = dutyUp === 'HD';
    const donHomolog = /^(P)[0-9]{4,}$/i.test(String(data.donaldson_code || data.homologated_code || ''));
    if (isHD) {
        if (donHomolog) {
            cleanedCR = cleanedCR.filter(c => /^(P)[0-9]{4,}$/i.test(c));
        } else {
            cleanedCR = cleanedCR.filter(c => HD_AFTERMARKET_PREFIXES.some(rx => rx.test(c)));
        }
    }
    const crVisualStr = cleanedCR.slice(0, 8).join(', ');
    const crossRefHDQualityFlag = (() => {
        if (!isHD) return '';
        const hadInputCR = (rawCR && rawCR.length > 0);
        if (hadInputCR && cleanedCR.length === 0) {
            return '⚠️ HD: referencias cruzadas no HD descartadas; revisar homologación OEM.';
        }
        return '';
    })();

    // Limpiar y clasificar OEM genuinos
    const cleanedOem = cleanOemCodes(rawOem);
    // Ranking comercial y límite para hoja (G)
    let top8Oem = [];
    try {
        const { rankAndLimit } = require('../utils/oemRanker');
        top8Oem = rankAndLimit(cleanedOem, 8);
    } catch (_) {
        top8Oem = cleanedOem.slice(0, 8);
    }

    // Ãndice backend: incluye TODOS los cÃ³digos (CR + OEM), deduplicados
    const oemIndexAll = Array.from(new Set([...cleanedOem, ...cleanedCR]));

    // Calidad de altura: validar coherencia bÃ¡sica segÃºn familia y subtipo/duty
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
    // Micron rating extraction: capture first numeric value associated to Âµm/um/micron
    const normalizeMicronToUm = (raw) => {
        let s = String(raw || '').trim();
        if (!s) return NaN;
        s = s.replace(/Î¼/g, 'Âµ');
        // Common forms: "99% @ 20Âµ", "20 Âµm", "4um", "25 microns"
        let m = s.match(/@\s*([0-9]+(?:\.[0-9]+)?)\s*Âµm?/i);
        if (!m) m = s.match(/([0-9]+(?:\.[0-9]+)?)\s*Âµm?/i);
        if (!m) m = s.match(/([0-9]+(?:\.[0-9]+)?)\s*um\b/i);
        if (!m) m = s.match(/([0-9]+(?:\.[0-9]+)?)\s*micron(?:s)?\b/i);
        const val = m ? parseFloat(m[1]) : NaN;
        return isNaN(val) ? NaN : val;
    };
    // Normalize minimum operating temperature to Celsius
    const normalizeTempMinC = (raw) => {
        let s = String(raw || '').trim();
        if (!s) return NaN;
        s = s.replace(/[Â°Âº]/g, '');
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
        s = s.replace(/[Â°Âº]/g, '');
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
            'DiÃ©sel',
            'Gasolina',
            'ATF (Fluido de TransmisiÃ³n)',
            'LÃ­quido HidrÃ¡ulico (HV/HL)',
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
                .replace(/aceites sintÃ©ticos|synthetic oils|synthetic/g, 'motor oil')
                .replace(/biodi[eÃ©]sel/g, 'diesel')
                .replace(/petrol/g, 'gasoline')
                .replace(/antifreeze|glycol/g, 'coolant')
                .trim();
            // Mapping
            if (/\b(engine|motor)\s*oil\b|\baceite\b/.test(cleaned)) return 'Aceite de Motor';
            if (/\bdiesel\b|\bgaso[Ã³]leo\b/.test(cleaned)) return 'DiÃ©sel';
            if (/\bgasoline\b|\bgas\b|\bpetrol\b|\bgasolina\b/.test(cleaned)) return 'Gasolina';
            if (/\batf\b|transmission\s*fluid|fluido de transmisi[Ã³o]n/.test(cleaned)) return 'ATF (Fluido de TransmisiÃ³n)';
            if (/hydraulic\s*(fluid|oil)|l[iÃ­]quido hidr[aÃ¡]ulico|\bhv\b|\bhl\b/.test(cleaned)) return 'LÃ­quido HidrÃ¡ulico (HV/HL)';
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
            return 'âš ï¸ Altura fuera de rango tÃ­pico para filtro de aceite Spin-On (70â€“200 mm).';
        }
        if (familyPrefix === 'AIR' && String(data.duty || '').toUpperCase() === 'HD' && heightVal < 150) {
            return 'âš ï¸ Altura inusualmente baja para elemento de aire Heavy Duty (>150 mm recomendado).';
        }
        return '';
    })();
    const outerDiameterQualityFlag = (() => {
        if (isNaN(odVal)) return '';
        if (isSpinOnOil && (odVal < 70 || odVal > 100)) {
            return 'âš ï¸ DiÃ¡metro exterior fuera de rango tÃ­pico para filtro de aceite Spin-On (70â€“100 mm).';
        }
        if (familyPrefix === 'AIR' && String(data.duty || '').toUpperCase() === 'HD' && odVal < 120) {
            return 'âš ï¸ DiÃ¡metro exterior inusualmente bajo para elemento de aire Heavy Duty (>120 mm recomendado).';
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
        if (tempMinCVal >= 0) return 'âš ï¸ Temperatura mÃ­nima debe ser negativa (valor en Â°C).';
        // General recommended band: -10Â°C to -50Â°C
        if (tempMinCVal > -10) return 'âš ï¸ MÃ­nima inusualmente alta (se espera â‰¤ -10Â°C).';
        if (tempMinCVal < -50) return 'âš ï¸ MÃ­nima inusualmente baja (se espera â‰¥ -50Â°C).';
        // Tech coherence: ELIMTEK SYNTHETIC or ULTRA usually â‰¤ -30Â°C
        const desc = String(finalDescription || '').toUpperCase();
        const techSynthetic = desc.includes('ELIMTEKâ„¢ SYNTHETIC');
        const techUltra = desc.includes('ELIMTEKâ„¢ ULTRA');
        if ((techSynthetic || techUltra) && tempMinCVal > -30) {
            return 'âš ï¸ MÃ­nima alta para tecnologÃ­a ELIMTEKâ„¢ (esperado â‰¤ -30Â°C).';
        }
        return '';
    })();
    const tempMaxQualityFlag = (() => {
        if (isNaN(tempMaxCVal)) return '';
        if (tempMaxCVal <= 0) return 'âš ï¸ Temperatura mÃ¡xima debe ser positiva (valor en Â°C).';
        // Typical band: 90Â°C â€“ 170Â°C
        if (tempMaxCVal < 90) return 'âš ï¸ MÃ¡xima inusualmente baja (se espera â‰¥ 90Â°C).';
        if (tempMaxCVal > 170) return 'âš ï¸ MÃ¡xima inusualmente alta (se espera â‰¤ 170Â°C).';
        const desc = String(finalDescription || '').toUpperCase();
        const techSynthetic = desc.includes('ELIMTEKâ„¢ SYNTHETIC');
        const hasSilicone = /silicona|silicone/i.test(String(attrs.seal_material || ''));
        if ((techSynthetic || hasSilicone) && tempMaxCVal < 130) {
            return 'âš ï¸ MÃ¡xima baja para medio sintÃ©tico/sellos de silicona (esperado â‰¥ 130Â°C).';
        }
        if (familyPrefix === 'OIL' && tempMaxCVal < 120) {
            return 'âš ï¸ MÃ¡xima baja para familia OIL (esperado â‰¥ 120Â°C).';
        }
        if ((familyPrefix === 'AIR' || familyPrefix === 'CABIN') && tempMaxCVal > 130) {
            return 'âš ï¸ MÃ¡xima inusualmente alta para AIR/CABIN (revisar coherencia).';
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
            return 'âš ï¸ Compatibilidad de fluidos vacÃ­a; verificar fuente.';
        }
        if (familyPrefix === 'OIL' && !fluidCompatArr.includes('Aceite de Motor')) {
            return 'âš ï¸ Falta "Aceite de Motor" para familia OIL.';
        }
        if (familyPrefix === 'FUEL' && !(fluidCompatArr.includes('DiÃ©sel') || fluidCompatArr.includes('Gasolina'))) {
            return 'âš ï¸ FUEL debe incluir "DiÃ©sel" o "Gasolina".';
        }
        const descUp = String(finalDescription || '').toUpperCase();
        const isTransmission = /TRANSMISSION|ATF/.test(descUp);
        if (isTransmission && !fluidCompatArr.includes('ATF (Fluido de TransmisiÃ³n)')) {
            return 'âš ï¸ Falta ATF para filtro de transmisiÃ³n.';
        }
        if ((familyPrefix === 'AIR' || familyPrefix === 'CABIN') && fluidCompatArr.some(v => v !== '')) {
            // If we ever map a liquid for AIR/CABIN, warn
            const liquids = ['Aceite de Motor', 'DiÃ©sel', 'Gasolina', 'ATF (Fluido de TransmisiÃ³n)', 'LÃ­quido HidrÃ¡ulico (HV/HL)', 'Refrigerante (Glicol/Agua)'];
            if (fluidCompatArr.some(v => liquids.includes(v))) return 'âš ï¸ Incompatible: AIR/CABIN no lleva lÃ­quidos.';
        }
        return '';
    })();
    // Disposal method normalization
    const normalizeDisposalMethod = (raw, family) => {
        const input = String(raw || '').toLowerCase();
        const hazardousHints = /(hazardous|peligroso|hazmat|aceite usado|used oil|diesel|fuel|coolant|hydraulic|glycol)/i;
        const nonHazardHints = /(non[- ]?hazardous|no peligroso|general waste|reciclable|recyclable|common)/i;
        if (hazardousHints.test(input)) return 'Residuo Peligroso (GestiÃ³n Controlada)';
        if (nonHazardHints.test(input)) return 'Residuo No Peligroso (Reciclable/ComÃºn)';
        // Fallback by family prefix
        const liquidFamilies = new Set(['OIL', 'FUEL', 'HYDRAULIC', 'COOLANT']);
        if (liquidFamilies.has(family)) return 'Residuo Peligroso (GestiÃ³n Controlada)';
        if (family === 'AIR' || family === 'CABIN') return 'Residuo No Peligroso (Reciclable/ComÃºn)';
        // Default conservative
        return 'Residuo Peligroso (GestiÃ³n Controlada)';
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
            return 'âš ï¸ AIR/CABIN no deberÃ­a ser Residuo Peligroso.';
        }
        const liquidFamilies = new Set(['OIL', 'FUEL', 'HYDRAULIC', 'COOLANT']);
        if (liquidFamilies.has(familyPrefix) && isNonHaz) {
            return 'âš ï¸ LÃ­quidos deben ser Residuo Peligroso (GestiÃ³n Controlada).';
        }
        return '';
    })();

    // Determinar si aplicar fallbacks temporales y preparar salida/nota
    const sealMaterialRaw = String(attrs.seal_material || '').toLowerCase();
    const isVitonSeal = /(viton|fkm|fluoro)/i.test(String(attrs.seal_material || ''));
    const skuUpper = String(data.sku || '').toUpperCase();
    const excludeSkuFromFallback = FALLBACK_TEMP_SKU_EXCLUDE_LIST.includes(skuUpper);
    const minIsFallback = (isNaN(tempMinCVal) && FALLBACK_TEMP_ENABLED && !excludeSkuFromFallback);
    const maxIsFallback = (isNaN(tempMaxCVal) && FALLBACK_TEMP_ENABLED && !excludeSkuFromFallback);
    const tempMinOut = excludeSkuFromFallback
        ? ''
        : (minIsFallback ? Number(FALLBACK_TEMP_MIN_C) : (isNaN(tempMinCVal) ? '' : Number(tempMinCVal.toFixed(1))));
    const tempMaxOut = excludeSkuFromFallback
        ? ''
        : (maxIsFallback ? Number(isVitonSeal ? FALLBACK_TEMP_MAX_VITON_C : FALLBACK_TEMP_MAX_NITRILE_C) : (isNaN(tempMaxCVal) ? '' : Number(tempMaxCVal.toFixed(1))));
    const fallbackTempUsed = (!excludeSkuFromFallback) && (minIsFallback || maxIsFallback);

    // Calcular dimensiones normalizadas y aplicar estimación pública si falta (sólo AIR)
    const heightIn = normalizeMM(
        attrs.height_mm ||
        attrs.height ||
        attrs.length ||
        attrs.overall_height ||
        attrs.total_length ||
        attrs['overall height'] ||
        attrs['total length'] ||
        ''
    );
    const odIn = normalizeMM(
        attrs.outer_diameter_mm ||
        attrs.outer_diameter ||
        attrs.major_diameter ||
        attrs['outer diameter'] ||
        attrs['major diameter'] ||
        attrs.od ||
        attrs['od'] ||
        ''
    );
    const heightNum = parseFloat(String(heightIn || ''));
    const odNum = parseFloat(String(odIn || ''));
    const isAirFamily = familyPrefix === 'AIR';
    let heightOut = heightIn;
    let odOut = odIn;
    if (PUBLIC_DIM_ESTIMATE_ENABLED && isAirFamily) {
        const isHD = String(data.duty || '').toUpperCase() === 'HD';
        if (!isFinite(heightNum) || heightNum <= 0) {
            heightOut = String(isHD ? AIR_EST_HD_HEIGHT_MM : AIR_EST_LD_HEIGHT_MM);
        }
        if (!isFinite(odNum) || odNum <= 0) {
            odOut = String(isHD ? AIR_EST_HD_OD_MM : AIR_EST_LD_OD_MM);
        }
    }

    // Resolver canónico de subtype (Columna F) con prioridades
    const canonicalSubtype = (() => {
        try {
            return resolveSubtype({
                family: familyPrefix,
                duty: data.duty,
                typeCanon: typeValue,
                query: data.query_normalized || data.code_input || data.sku || '',
                existingSubtype: attrs.subtype || attrs.style || '',
                description: finalDescription,
                media_type: mediaTypeBase,
                cross_reference: crVisualStr,
                attributes: attrs
            }) || '';
        } catch (_) { return ''; }
    })();

    // Normalizar tecnología detectada por scrapers (FRAM/Donaldson/Fleetguard)
    const rawTecnologia = (
        (attrs.tecnologia_aplicada && String(attrs.tecnologia_aplicada).trim()) ||
        (data.tecnologia_aplicada && String(data.tecnologia_aplicada).trim()) ||
        ''
    );
    // Enriquecer la señal de normalización con códigos OEM y SKU para EM9/ET9
    const signalStr = [
        rawTecnologia,
        Array.isArray(top8Oem) ? top8Oem.join(' ') : '',
        String(data.sku || ''),
        String(data.query_normalized || data.code_input || '')
    ].join(' ').trim();
    const techInfo = normalizeTechnology(signalStr, familyPrefix, data.duty || '');

    return {
        query: data.query_normalized || data.code_input || '',
        normsku: data.sku || '',
        duty_type: data.duty || '',
        type: typeValue,
        subtype: (canonicalSubtype || subtypeDescriptor),
        family: familyPrefix,
        filter_type: typeValue,
        description: finalDescription,
        oem_codes: top8Oem.join(', '),
        // Índice Mongo (todos los OEM visibles). No se escribe en Sheet.
        oem_codes_indice_mongo: cleanedOem,
        // En HD, las referencias cruzadas deben ser del sector HD y homologadas al OEM del filtro
        cross_reference: (isHD ? crVisualStr : (crVisualStr || top8Oem.join(', '))),
        cross_reference_quality_flag: crossRefHDQualityFlag,
        // Índice interno completo de CR (todas las referencias visibles); no se escribe en Sheet
        cross_reference_indice_mongo: cleanedCR,
        media_type: mediaTypeBase,
        tecnologia_aplicada: (
            (techInfo && techInfo.tecnologia_aplicada) ||
            getProductTechnology(familyPrefix, data.duty, data.sku)
        ),
        technology_name: (techInfo && techInfo.technology_name) || '',
        technology_tier: (techInfo && techInfo.technology_tier) || '',
        technology_scope: (techInfo && techInfo.technology_scope) || '',
        technology_equivalents: (techInfo && techInfo.technology_equivalents) || '',
        technology_oem_detected: rawTecnologia,
        equipment_applications: formatApps(data.equipment_applications || attrs.equipment_applications),
        engine_applications: buildMotorFinalAndIndex(data.engine_applications || data.applications || [], data.duty || '').finalList.join(', '),
        height_mm: heightOut,
        outer_diameter_mm: odOut,
        micron_rating: (isNaN(micronVal) ? '' : `${micronVal} Âµm`),
        operating_temperature_min_c: tempMinOut,
        operating_temperature_max_c: tempMaxOut,
        fluid_compatibility: fluidCompatStr,
        disposal_method: disposalMethodStr,
        gasket_od_mm: (() => {
            // Only relevant for spin-on in liquid families
            const liquidFamilies = new Set(['OIL', 'FUEL', 'HYDRAULIC', 'COOLANT']);
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
                attrs['diÃ¡metro exterior junta'] ||
                attrs['diÃ¡metro exterior de junta'] ||
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
            const liquidFamilies = new Set(['OIL', 'FUEL', 'COOLANT', 'HYDRAULIC']);
            if (!liquidFamilies.has(familyPrefix)) return '';
            if (familyPrefix === 'AIR' || familyPrefix === 'CABIN') return '';
            // If we lack explicit spin-on, accept when source provides a thread value
            if (!isSpinOnDesign && !norm) return '';
            return norm;
        })(),
        // No backend-only indices in Master output
        fluid_compatibility_quality_flag: fluidCompatQualityFlag,
        disposal_method_indice_mongo: disposalMethodStr || undefined,
        disposal_method_quality_flag: disposalQualityFlag,
        gasket_id_mm: (() => {
            const liquidFamilies = new Set(['OIL', 'FUEL', 'HYDRAULIC', 'COOLANT']);
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
                attrs['diÃ¡metro interior junta'] ||
                attrs['diÃ¡metro interior de junta'] ||
                ''
            );
            const val = parseFloat(valStr || '');
            return isNaN(val) ? '' : Number(val.toFixed(2));
        })(),
        bypass_valve_psi: (() => {
            // Only meaningful for Spin-On Full-Flow in liquid families OIL/FUEL
            const liquidFamilies = new Set(['OIL', 'FUEL', 'HYDRAULIC', 'COOLANT']);
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
                attrs['presiÃ³n de derivaciÃ³n'] ||
                attrs['presion de derivacion'] ||
                ''
            );
            const val = normalizePressureToPsi(raw);
            return isNaN(val) ? '' : Number(val.toFixed(1));
        })(),
        beta_200: (() => {
            // Solo aplica a filtros de fase lÃ­quida OIL/FUEL/HYDRAULIC
            const applicable = new Set(['OIL', 'FUEL', 'HYDRAULIC']);
            if (!applicable.has(familyPrefix)) return '';
            const raw = (
                attrs.beta_200 ||
                attrs.beta_ratio ||
                attrs.beta_value ||
                attrs['beta 200'] ||
                attrs['beta200'] ||
                attrs['Î²200'] ||
                attrs.beta ||
                ''
            );
            const val = normalizeBetaRatio(raw);
            return isNaN(val) || val <= 0 ? '' : Number(val);
        })(),
        hydrostatic_burst_psi: (() => {
            const applicable = new Set(['OIL', 'FUEL', 'HYDRAULIC']);
            if (!applicable.has(familyPrefix)) return '';
            const raw = (
                attrs.hydrostatic_burst_psi ||
                attrs.burst_pressure ||
                attrs.maximum_structural_strength ||
                attrs.structural_strength ||
                attrs['presiÃ³n de estallido'] ||
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
            const applicable = new Set(['AIR', 'CABIN']);
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
            const applicable = new Set(['AIR', 'CABIN']);
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
            // Política general: datos funcionales no primarios → 0% o NULO según env
            const policy = String(process.env.NONPRIMARY_FUNCTIONAL_POLICY || 'null').toLowerCase();
            const useZero = policy === 'zero';
            // Override histórico: P552100 → 0%
            const skuUp = String(data.sku || '').toUpperCase();
            if (skuUp === 'P552100') return 0;
            // Solo aplica para FUEL; en otras familias, devolver 0 o vacío según política
            if (familyPrefix !== 'FUEL') return useZero ? 0 : '';
            const isSeparator = /separator|separador|separaciÃ³n/i.test(String(subtypeDescriptor || ''));
            const raw = (
                attrs.water_separation_efficiency_percent ||
                attrs.water_separation_efficiency ||
                attrs.wse ||
                attrs['Water Separation Efficiency'] ||
                attrs['WSE'] ||
                attrs['Rendimiento de SeparaciÃ³n de H2O'] ||
                attrs['Eficiencia de SeparaciÃ³n de Agua'] ||
                ''
            );
            const s = String(raw).trim();
            if (!s) return isSeparator ? '' : '';
            const lower = s.toLowerCase().replace(/,/g, '.');
            const m = lower.match(/([0-9]+(?:\.[0-9]+)?)/);
            if (!m) return '';
            const n = parseFloat(m[1]);
            if (isNaN(n)) return '';
            // clamp bÃ¡sica a [0, 100]
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

            // VacÃ­o para Spin-On y Panel
            if (isSpinOn || isPanel) return '';

            // ExtracciÃ³n dirigida
            const raw = (
                attrs.inner_diameter_mm ||
                attrs.inner_diameter ||
                attrs['Inner Diameter'] ||
                attrs['I.D.'] ||
                attrs.ID ||
                attrs['Minor Diameter'] ||
                attrs.minor_diameter ||
                attrs['DiÃ¡metro interior'] ||
                attrs['DiÃ¡metro menor'] ||
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
                if (/(viton|fkm|fluorocarbon|fluoro\s*elastomer|fluoroelast[oÃ³]mero)/i.test(t)) return 'Fluorocarbono (Viton / FKM)';
                if (/(acrylic|acr[iÃ­]lico|acm)/i.test(t)) return 'AcrÃ­lico (ACM)';
                if (/(epdm|ethylene[- ]propylene|etileno[- ]propileno)/i.test(t)) return 'Etileno-Propileno (EPDM)';
                return '';
            };
            const normalized = mapSeal(s);
            if (isPanel || isCabin) return ''; // Panel/Cabina: debe ser vacÃ­o
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
                if (/(alumin[iÃ­]o|aluminum)/i.test(t)) return 'Aluminio (Aluminum)';
                if (/(nylon|polymer|pl[aÃ¡]stico|polyamide|pa\s*66|composite)/i.test(t)) return 'Nylon/PlÃ¡stico Reforzado (Polymer/Nylon)';
                if (/(fiberglass|fibra\s*de\s*vidrio|frp)/i.test(t)) return 'Fibra de Vidrio Reforzada (Fiberglass Reinforced)';
                return '';
            };
            return mapHousing(s);
        })(),
        iso_main_efficiency_percent: (() => {
            const typeRaw = String((data.type || attrs.type || '')).trim().toLowerCase();
            const isAir = /\bair\b|\baire\b/.test(typeRaw);
            const isCabin = /\bcabin\b|\bcabina\b/.test(typeRaw);
            // Política general: datos funcionales no primarios → 0% o NULO según env
            const policy = String(process.env.NONPRIMARY_FUNCTIONAL_POLICY || 'null').toLowerCase();
            const useZero = policy === 'zero';
            if (isAir || isCabin) return useZero ? 0 : '';

            const candidates = [
                attrs.iso_main_efficiency_percent,
                attrs['ISO Efficiency'],
                attrs['Multi-Pass Efficiency'],
                attrs['Multi Pass Efficiency'],
                attrs['Î²x Efficiency'],
                attrs['Beta Efficiency'],
                attrs['Efficiency @ 10 Âµm'],
                attrs['Efficiency @ 20 Âµm'],
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
                const mm = s.match(/(\d+(?:\.\d+)?)\s*(Âµm|um|micron|microns|micr[oÃ³]n|micr[oÃ³]metro|micr[oÃ³]metros)/i);
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
                    chosen = preferred.sort((a, b) => b.percent - a.percent)[0];
                } else {
                    chosen = withMicron.sort((a, b) => b.percent - a.percent)[0];
                }
            } else {
                chosen = parsed.sort((a, b) => b.percent - a.percent)[0];
            }
            if (!chosen || isNaN(chosen.percent)) return '';
            return String(Number(chosen.percent.toFixed(1))); // solo nÃºmero, sin "%"
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
                attrs['MÃ©todo de Prueba ISO'],
                attrs['Norma ISO'],
                attrs['EstÃ¡ndar ISO'],
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
                attrs['Normas de ProducciÃ³n'],
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
            const ORDER = ['ISO 9001', 'IATF 16949', 'ISO 14001', 'ISO 45001'];
            const sorted = all.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
            return sorted.join(', ');
        })(),
        certification_standards: (() => {
            const candidates = [
                attrs.certification_standards,
                attrs.homologation,
                attrs['Homologation'],
                attrs['Product Approval'],
                attrs['Compliance'],
                attrs['AprobaciÃ³n de Producto'],
                attrs['Conformidad'],
                attrs.description,
                data.description
            ].filter(Boolean);
            const extract = (text) => {
                const s = String(text || '');
                const out = new Set();
                if (/(?:\bCE\b|conformidad\s*europea|conformitÃ©\s*europÃ©enne)/i.test(s)) out.add('CE');
                if (/(?:\bECE\b|reglamento\s*ece|un\s*e\s*ce)/i.test(s)) out.add('ECE');
                if (/\bSAE\b/i.test(s)) out.add('SAE');
                if (/\bAPI\b/i.test(s)) out.add('API');
                if (/\bASTM\b/i.test(s)) out.add('ASTM');
                return Array.from(out);
            };
            const all = Array.from(new Set(candidates.flatMap(extract)));
            const ORDER = ['CE', 'ECE', 'SAE', 'API', 'ASTM'];
            let base = '';
            if (all.length) {
                const sorted = all.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
                base = sorted.join(', ');
            }
            if (fallbackTempUsed) {
                const note = `Valor Estimado${isVitonSeal ? ' (Viton)' : ' (Nitrilo)'}`;
                base = base ? `${base}, ${note}` : note;
            }
            return base;
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
                attrs['AprobaciÃ³n de Producto'],
                attrs['Conformidad'],
                attrs.description,
                data.description
            ].filter(Boolean);
            const extract = (text) => {
                const s = String(text || '');
                const out = [];
                if (/(?:\bCE\b|conformidad\s*europea|conformitÃ©\s*europÃ©enne)/i.test(s)) out.push('CE');
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
                attrs['AprobaciÃ³n de Producto'],
                attrs['Conformidad'],
                attrs.description,
                data.description
            ].filter(Boolean).join(' | ');
            if (/iso\s*-?\s*9001|iatf\s*-?\s*16949/i.test(combined)) {
                return 'âš ï¸ Evitar duplicaciÃ³n: ISO 9001/IATF 16949 pertenecen a AO (gestiÃ³n de calidad).';
            }
            const isElimfilters = /ELIMFILTERS/.test(brandStr) || /ELIMTEK/.test(String(combined));
            const hasProductCert = /(\bCE\b|\bECE\b|\bSAE\b|\bAPI\b|\bASTM\b)/i.test(combined);
            if (isElimfilters && !hasProductCert) {
                return 'âš ï¸ ELIMFILTERS: se recomienda declarar homologaciones de producto (CE/SAE/ECE/API/ASTM).';
            }
            return '';
        })(),
        // AQ â€” Service Life (hours)
        service_life_hours: (() => {
            const sources = [
                attrs.service_life_hours,
                attrs['Service Life'],
                attrs['Service Interval'],
                attrs['Intervalo de Servicio'],
                attrs['Filter Life'],
                attrs['Horas de OperaciÃ³n'],
                attrs['Horas de OperaciÃ³n Recomendadas'],
                attrs['Operating Hours'],
                attrs['Recommended Operating Hours'],
                attrs.description,
                data.description
            ].filter(Boolean);

            const pickNumericMax = (text) => {
                const s = String(text || '');
                // Capture ranges like 500-750 h or 500â€“750 hrs, or single values with units
                const rangeMatch = s.match(/(\d{2,5}[\.,]?\d*)\s*[â€“-]\s*(\d{2,5}[\.,]?\d*)\s*(h(?:ours)?|hrs?|horas|mile?s?|km)/i);
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
                attrs['Horas de OperaciÃ³n'],
                attrs['Horas de OperaciÃ³n Recomendadas'],
                attrs['Operating Hours'],
                attrs['Recommended Operating Hours'],
                attrs.description,
                data.description
            ].filter(Boolean);
            const pick = (text) => {
                const s = String(text || '');
                const rangeMatch = s.match(/(\d{2,5}[\.,]?\d*)\s*[â€“-]\s*(\d{2,5}[\.,]?\d*)\s*(h(?:ours)?|hrs?|horas|mile?s?|km)/i);
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
                attrs['Horas de OperaciÃ³n'],
                attrs['Horas de OperaciÃ³n Recomendadas'],
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
                return 'âš ï¸ Fuente en millas/km: conversiÃ³n heurÃ­stica a horas aplicada; verificar con fabricante.';
            }
            const hours = (() => {
                const h = String((typeof service_life_hours !== 'undefined' ? service_life_hours : '')).trim();
                return h ? parseInt(h, 10) : undefined;
            })();
            if (/HD/.test(duty) && Number.isFinite(hours)) {
                if (hours < 250 || hours > 1000) {
                    return 'âš ï¸ HD: fuera de rango tÃ­pico (250â€“1000 h). Ajuste segÃºn aplicaciÃ³n.';
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
                attrs['Horas de OperaciÃ³n'],
                attrs['Horas de OperaciÃ³n Recomendadas'],
                attrs['Operating Hours'],
                attrs['Recommended Operating Hours'],
                attrs.description,
                data.description
            ].filter(Boolean);
            const pick = (text) => {
                const s = String(text || '');
                const rangeMatch = s.match(/(\d{2,5}[\.,]?\d*)\s*[â€“-]\s*(\d{2,5}[\.,]?\d*)\s*(h(?:ours)?|hrs?|horas|mile?s?|km)/i);
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
        // AR â€” Change Interval (kilometers)
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
                const rangeMatch = s.match(/(\d[\d.,]*)\s*[â€“-]\s*(\d[\d.,]*)\s*(km|kilometros|kilometers|mile?s?)/i);
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
                const rangeMatch = s.match(/(\d[\d.,]*)\s*[â€“-]\s*(\d[\d.,]*)\s*(km|kilometros|kilometers|mile?s?)/i);
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
                    return 'âš ï¸ LD: Intervalo de cambio en km es obligatorio.';
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
                    attrs['Horas de OperaciÃ³n'],
                    attrs['Horas de OperaciÃ³n Recomendadas'],
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
                    return 'âš ï¸ HD: revisar coherencia entre km y horas (Â±30%).';
                }
            }
            // Rango tÃ­pico (Oil LD/HD): 10kâ€“50k km
            if (Number.isFinite(computedKm)) {
                if (computedKm < 10000 || computedKm > 50000) {
                    return 'âš ï¸ Fuera de rango tÃ­pico (10,000â€“50,000 km). Ajuste segÃºn aplicaciÃ³n.';
                }
            }
            // ConversiÃ³n miles
            if (kmCalcPresent && !kmVal) {
                return 'âš ï¸ Fuente en millas: conversiÃ³n obligatoria aplicada (1 mi â‰ˆ 1.60934 km).';
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
                attrs['Normas de ProducciÃ³n'],
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
                    attrs['Normas de ProducciÃ³n'],
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
            const required = ['ISO 9001', 'IATF 16949', 'ISO 14001'];
            const missing = required.filter(r => !arr.includes(r));
            if (missing.length) {
                return `âš ï¸ ELIMFILTERS: faltan certificaciones requeridas: ${missing.join(', ')}.`;
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
                attrs['MÃ©todo de Prueba ISO'],
                attrs['Norma ISO'],
                attrs['EstÃ¡ndar ISO'],
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
            const isHydraulic = /\bhydraulic\b|\bhidr[aÃ¡]ulic[oa]\b/.test(typeRaw);
            const isFuel = /\bfuel\b|\bcombustible\b|\bdi[eÃ©]sel|gasolina/.test(typeRaw);
            const isAir = /\bair\b|\baire\b/.test(typeRaw);
            const isCabin = /\bcabin\b|\bcabina\b/.test(typeRaw);

            const rawMethod = [
                attrs.iso_test_method,
                attrs['ISO Test Method'],
                attrs['Test Standard'],
                attrs['Certification'],
                attrs['ISO Standard'],
                attrs['MÃ©todo de Prueba ISO'],
                attrs['Norma ISO'],
                attrs['EstÃ¡ndar ISO'],
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
                (attrs.beta_200 || attrs['Î²200'] || '')
            ).toLowerCase();
            const hasBeta = /\d/.test(betaRaw);
            const isoEffStr = String(
                (attrs.iso_main_efficiency_percent || attrs['ISO Efficiency'] || '')
            );
            const hasIsoEff = /\d/.test(isoEffStr);

            if ((isOil || isHydraulic || isFuel) && (hasBeta || hasIsoEff) && !norm) {
                return 'âš ï¸ Falta MÃ©todo de Prueba ISO (AN) para filtro lÃ­quido con Beta/Eficiencia.';
            }
            if ((isAir || isCabin) && norm) {
                return 'âš ï¸ Air/Cabin: el mÃ©todo ISO debe ser vacÃ­o; usan SAE/ASHRAE.';
            }
            if (hasBeta && norm && !/ISO\s*(16889|4548-12)/i.test(norm)) {
                return 'âš ï¸ Beta presente: se espera norma de Pasadas MÃºltiples (ISO 16889 o ISO 4548-12).';
            }
            return '';
        })(),
        iso_main_efficiency_percent_indice_mongo: (() => {
            const typeRaw = String((data.type || attrs.type || '')).trim().toLowerCase();
            const isAir = /\bair\b|\baire\b/.test(typeRaw);
            const isCabin = /\bcabin\b|\bcabina\b/.test(typeRaw);
            const policy = String(process.env.NONPRIMARY_FUNCTIONAL_POLICY || 'null').toLowerCase();
            const useZero = policy === 'zero';
            if (isAir || isCabin) return useZero ? 0 : undefined;
            const candidates = [
                attrs.iso_main_efficiency_percent,
                attrs['ISO Efficiency'],
                attrs['Multi-Pass Efficiency'],
                attrs['Multi Pass Efficiency'],
                attrs['Î²x Efficiency'],
                attrs['Beta Efficiency'],
                attrs['Efficiency @ 10 Âµm'],
                attrs['Efficiency @ 20 Âµm'],
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
                const mm = s.match(/(\d+(?:\.\d+)?)\s*(Âµm|um|micron|microns|micr[oÃ³]n|micr[oÃ³]metro|micr[oÃ³]metros)/i);
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
                chosen = (preferred.length ? preferred : withMicron).sort((a, b) => b.percent - a.percent)[0];
            } else {
                chosen = parsed.sort((a, b) => b.percent - a.percent)[0];
            }
            return (chosen && !isNaN(chosen.percent)) ? chosen.percent : undefined;
        })(),
        iso_main_efficiency_quality_flag: (() => {
            const typeRaw = String((data.type || attrs.type || '')).trim().toLowerCase();
            const isOil = /\boil\b|\baceite\b/.test(typeRaw);
            const isHydraulic = /\bhydraulic\b|\bhidr[aÃ¡]ulic[oa]\b/.test(typeRaw);
            const isAir = /\bair\b|\baire\b/.test(typeRaw);
            const isCabin = /\bcabin\b|\bcabina\b/.test(typeRaw);
            const valStr = String(
                (attrs.iso_main_efficiency_percent ||
                    attrs['ISO Efficiency'] ||
                    attrs['Multi-Pass Efficiency'] ||
                    attrs['Multi Pass Efficiency'] ||
                    attrs['Î²x Efficiency'] ||
                    attrs['Beta Efficiency'] ||
                    attrs['Efficiency @ 10 Âµm'] ||
                    attrs['Efficiency @ 20 Âµm'] ||
                    attrs['Efficiency at 10 micron'] ||
                    attrs['Efficiency at 20 micron'] ||
                    attrs['Eficiencia ISO'] ||
                    attrs['Eficiencia Multi-Pass'] || ''
                )).toLowerCase();
            const pm = valStr.match(/(\d+(?:\.\d+)?)\s*%?/);
            const val = pm ? parseFloat(pm[1]) : NaN;
            if ((isOil || isHydraulic) && (isNaN(val) || valStr.trim() === '')) {
                return 'âš ï¸ Falta Eficiencia Principal ISO (AM) para tipo Oil/Hydraulic.';
            }
            if ((isAir || isCabin) && valStr.trim() !== '') {
                return 'âš ï¸ Air/Cabin: la Eficiencia ISO debe ser vacÃ­a; revisar.';
            }
            const desc = String((attrs.description || data.description || '')).toLowerCase();
            const isElimtek = /elimtek|absolut[oa]/.test(desc);
            if (isElimtek && !isNaN(val) && val < 98) {
                return 'âš ï¸ ELIMTEKâ„¢/Absoluta: se espera â‰¥98% (Multi-Pass).';
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
                if (/(viton|fkm|fluorocarbon|fluoro\s*elastomer|fluoroelast[oÃ³]mero)/i.test(t)) return 'Fluorocarbono (Viton / FKM)';
                if (/(acrylic|acr[iÃ­]lico|acm)/i.test(t)) return 'AcrÃ­lico (ACM)';
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
                if (/(viton|fkm|fluorocarbon|fluoro\s*elastomer|fluoroelast[oÃ³]mero)/i.test(s)) return 'Fluorocarbono (Viton / FKM)';
                if (/(acrylic|acr[iÃ­]lico|acm)/i.test(s)) return 'AcrÃ­lico (ACM)';
                if (/(epdm|ethylene[- ]propylene|etileno[- ]propileno)/i.test(s)) return 'Etileno-Propileno (EPDM)';
                return '';
            })();
            if ((isSpinOn || isSeparator || isRadialSeal) && !normalized) {
                return 'âš ï¸ Falta Material del Sello (AK) para diseÃ±o spin-on/separador/sello radial.';
            }
            if ((isPanel || isCabin) && normalized) {
                return 'âš ï¸ Panel/Cabina: material del sello debe ser vacÃ­o; revisar.';
            }
            // Coherencia con temperatura y quÃ­micos
            if (normalized === 'Nitrilo (NBR) / Buna-N' && Number(tempMaxCVal) >= 130) {
                return 'âš ï¸ NBR no Ã³ptimo para â‰¥130Â°C; considerar Silicona (VMQ) o FKM.';
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
            const demandsHighChem = /biodi[eÃ©]sel|bio[- ]diesel|sint[eÃ©]tico|synthetic/.test(rawFluid);
            if (demandsHighChem && normalized && normalized !== 'Fluorocarbono (Viton / FKM)') {
                return 'âš ï¸ Alta exigencia quÃ­mica: preferir Fluorocarbono (Viton / FKM).';
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
                if (/(alumin[iÃ­]o|aluminum)/i.test(t)) return 'Aluminio (Aluminum)';
                if (/(nylon|polymer|pl[aÃ¡]stico|polyamide|pa\s*66|composite)/i.test(t)) return 'Nylon/PlÃ¡stico Reforzado (Polymer/Nylon)';
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
                if (/(alumin[iÃ­]o|aluminum)/i.test(s)) return 'Aluminio (Aluminum)';
                if (/(nylon|polymer|pl[aÃ¡]stico|polyamide|pa\s*66|composite)/i.test(s)) return 'Nylon/PlÃ¡stico Reforzado (Polymer/Nylon)';
                if (/(fiberglass|fibra\s*de\s*vidrio|frp)/i.test(s)) return 'Fibra de Vidrio Reforzada (Fiberglass Reinforced)';
                return '';
            })();
            const hasHousingSignals = (
                !isNaN(parseFloat(String(attrs.hydrostatic_burst_psi || '').replace(/[^0-9\.]/g, ''))) ||
                !isNaN(parseFloat(String(attrs.operating_pressure_max_psi || '').replace(/[^0-9\.]/g, '')))
            );
            if ((isSpinOn || isSeparator || (isCartridge && hasHousingSignals)) && !normalized) {
                return 'âš ï¸ Falta Material de Carcasa (AL) para diseÃ±o requerido (spin-on/separador/cartucho con carcasa).';
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
                attrs['DiÃ¡metro interior'] ||
                attrs['DiÃ¡metro menor'] ||
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
                    attrs['DiÃ¡metro interior'] ||
                    attrs['DiÃ¡metro menor'] ||
                    ''
                ) || ''
            );

            if (isCartridge || isRadialSeal) {
                if (isNaN(innerVal)) {
                    return 'âš ï¸ Falta DiÃ¡metro Interior (mm) para diseÃ±o cartucho/sello radial.';
                }
                if (!isNaN(odVal) && innerVal >= odVal) {
                    return 'âš ï¸ DimensiÃ³n inconsistente: inner_diameter_mm debe ser menor que outer_diameter_mm.';
                }
                const hasThread = !!String(attrs.thread_size || '').trim();
                const hasGasketOD = !!normalizeMM(attrs.gasket_od_mm || attrs['Gasket OD'] || '');
                const hasGasketID = !!normalizeMM(attrs.gasket_id_mm || attrs['Gasket ID'] || '');
                if (hasThread || hasGasketOD || hasGasketID) {
                    return 'âš ï¸ DiseÃ±o cartucho/sello radial: usar diÃ¡metro interior en lugar de rosca/junta.';
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
                return 'âš ï¸ Falta Conteo de Pliegues (AJ) para diseÃ±o panel/cartucho.';
            }
            const text = [finalDescription, data.description, attrs.description].map(v => String(v || '')).join(' ').toUpperCase();
            const claimsPremium = /ELIMTEK|MACROCORE/.test(text);
            if (claimsPremium && !isNaN(val)) {
                const minPanel = 30;
                const minElement = 100;
                if ((isPanel && val < minPanel) || ((isCartridge || isRadialSeal) && val < minElement)) {
                    return 'âš ï¸ Pliegues bajos para tecnologÃ­a premium; revisar capacidad/diseÃ±o.';
                }
            }
            return '';
        })(),
        water_separation_efficiency_percent_indice_mongo: (() => {
            const policy = String(process.env.NONPRIMARY_FUNCTIONAL_POLICY || 'null').toLowerCase();
            const useZero = policy === 'zero';
            const skuUp = String(data.sku || '').toUpperCase();
            if (skuUp === 'P552100') return 0;
            if (familyPrefix !== 'FUEL') return useZero ? 0 : undefined;
            const raw = (
                attrs.water_separation_efficiency_percent ||
                attrs.water_separation_efficiency ||
                attrs.wse ||
                attrs['Water Separation Efficiency'] ||
                attrs['WSE'] ||
                attrs['Rendimiento de SeparaciÃ³n de H2O'] ||
                attrs['Eficiencia de SeparaciÃ³n de Agua'] ||
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
            const isSeparator = /separator|separador|separaciÃ³n/i.test(String(subtypeDescriptor || ''));
            const raw = (
                attrs.water_separation_efficiency_percent ||
                attrs.water_separation_efficiency ||
                attrs.wse ||
                attrs['Water Separation Efficiency'] ||
                attrs['WSE'] ||
                attrs['Rendimiento de SeparaciÃ³n de H2O'] ||
                attrs['Eficiencia de SeparaciÃ³n de Agua'] ||
                ''
            );
            const lower = String(raw).toLowerCase().replace(/,/g, '.');
            const m = lower.match(/([0-9]+(?:\.[0-9]+)?)/);
            const hasNum = !!m && !isNaN(parseFloat(m[1]));
            if (isSeparator && !hasNum) return 'âš ï¸ Falta Eficiencia de SeparaciÃ³n de Agua (%) para separador.';
            if (!hasNum) return '';
            let n = parseFloat(m[1]);
            if (isNaN(n)) return '';
            if (n <= 0 || n > 100) return 'âš ï¸ Valor invÃ¡lido de eficiencia (% fuera de rango).';
            if (n < 90) return 'âš ï¸ Eficiencia baja (<90%).';
            if (n >= 90 && n < 95) return 'âš ï¸ Eficiencia moderada (90â€“95%).';
            // Coherencia con tecnologÃ­a extendida si se menciona ~99%
            const desc = String(attrs.description || '').toUpperCase();
            if (/ELIMTEK|EXTENDED/.test(desc) && n < 95) {
                return 'âš ï¸ Inconsistente con tecnologÃ­a extendida 99%; revisar.';
            }
            return '';
        })(),
        panel_depth_mm_indice_mongo: (() => {
            const applicable = new Set(['AIR', 'CABIN']);
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
            const applicable = new Set(['AIR', 'CABIN']);
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
            if (isNaN(num) || num <= 0) return 'âš ï¸ Falta Profundidad/Grosor de Panel (mm).';
            // Coherencia de diseÃ±o: si hay diÃ¡metro exterior para panel, advertir uso de ancho/longitud/profundidad.
            const od = parseFloat(normalizeMM(attrs.outer_diameter_mm || attrs.outer_diameter || '') || '');
            if (!isNaN(od) && od > 0) {
                return 'âš ï¸ DiseÃ±o Panel: usar anchura/longitud/profundidad en lugar de diÃ¡metro exterior.';
            }
            // Integridad dimensional bÃ¡sica: si existe anchura pero falta profundidad (o viceversa) seÃ±alar completar terna.
            const w = parseFloat(normalizeMM(
                (attrs.panel_width_mm || attrs.width || attrs.panel_width || attrs['Panel Width'] || '')
            ) || '');
            if (isNaN(w)) {
                return 'âš ï¸ Falta Anchura de Panel; completar dimensiones (ancho, largo, profundidad).';
            }
            return '';
        })(),
        panel_width_mm_indice_mongo: (() => {
            const applicable = new Set(['AIR', 'CABIN']);
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
            const applicable = new Set(['AIR', 'CABIN']);
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
            if (isNaN(num) || num <= 0) return 'âš ï¸ Falta Anchura de Panel (mm).';
            // Coherencia: si diseÃ±o panel, no deberÃ­a depender de outer_diameter_mm
            const od = parseFloat(normalizeMM(attrs.outer_diameter_mm || attrs.outer_diameter || '') || '');
            if (!isNaN(od) && od > 0) {
                return 'âš ï¸ DiseÃ±o Panel: usar anchura/longitud en lugar de diÃ¡metro exterior.';
            }
            return '';
        })(),
        micron_rating_indice_mongo: (isNaN(micronVal) ? undefined : micronVal),
        operating_temperature_min_c_indice_mongo: (isNaN(tempMinCVal) ? undefined : Number(tempMinCVal.toFixed(1))),
        operating_temperature_min_quality_flag: tempMinQualityFlag,
        operating_temperature_max_c_indice_mongo: (isNaN(tempMaxCVal) ? undefined : Number(tempMaxCVal.toFixed(1))),
        operating_temperature_max_quality_flag: tempMaxQualityFlag,
        bypass_valve_psi_indice_mongo: (() => {
            const liquidFamilies = new Set(['OIL', 'FUEL', 'HYDRAULIC', 'COOLANT']);
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
                attrs['presiÃ³n de derivaciÃ³n'] ||
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
                attrs['presiÃ³n de derivaciÃ³n'] ||
                attrs['presion de derivacion'] ||
                ''
            );
            const val = normalizePressureToPsi(raw);
            if (isNaN(val)) return 'âš ï¸ Falta presiÃ³n de vÃ¡lvula de derivaciÃ³n (Bypass) para Spin-On Full-Flow en OIL/FUEL.';
            // Sanity bounds for LD oil filters (typical 8â€“30 PSI)
            if (val < 5) return 'âš ï¸ Bypass muy bajo; podrÃ­a derivar flujo sin filtrar prematuramente.';
            if (val > 35) return 'âš ï¸ Bypass muy alto; riesgo de hambre de aceite si el filtro se obstruye.';
            return '';
        })(),
        hydrostatic_burst_psi: (() => {
            const applicable = new Set(['OIL', 'FUEL', 'HYDRAULIC']);
            if (!applicable.has(familyPrefix)) return '';
            const raw = (
                attrs.hydrostatic_burst_psi ||
                attrs.burst_pressure ||
                attrs['Burst Pressure'] ||
                attrs.maximum_structural_strength ||
                attrs.structural_strength ||
                attrs['presiÃ³n de estallido'] ||
                attrs['presion de estallido'] ||
                attrs['PresiÃ³n de Estallido'] ||
                ''
            );
            const val = normalizePressureToPsi(raw);
            return isNaN(val) || val <= 0 ? '' : Math.round(val);
        })(),
        hydrostatic_burst_psi_indice_mongo: (() => {
            const applicable = new Set(['OIL', 'FUEL', 'HYDRAULIC']);
            if (!applicable.has(familyPrefix)) return undefined;
            const raw = (
                attrs.hydrostatic_burst_psi ||
                attrs.burst_pressure ||
                attrs['Burst Pressure'] ||
                attrs.maximum_structural_strength ||
                attrs.structural_strength ||
                attrs['presiÃ³n de estallido'] ||
                attrs['presion de estallido'] ||
                attrs['PresiÃ³n de Estallido'] ||
                ''
            );
            const val = normalizePressureToPsi(raw);
            return isNaN(val) || val <= 0 ? undefined : Math.round(val);
        })(),
        hydrostatic_burst_quality_flag: (() => {
            const applicable = new Set(['OIL', 'FUEL', 'HYDRAULIC']);
            if (!applicable.has(familyPrefix)) return '';
            const rawBurst = (
                attrs.hydrostatic_burst_psi ||
                attrs.burst_pressure ||
                attrs['Burst Pressure'] ||
                attrs.maximum_structural_strength ||
                attrs.structural_strength ||
                attrs['presiÃ³n de estallido'] ||
                attrs['presion de estallido'] ||
                attrs['PresiÃ³n de Estallido'] ||
                ''
            );
            const burst = normalizePressureToPsi(rawBurst);
            if (isNaN(burst) || burst <= 0) return 'âš ï¸ Falta PresiÃ³n HidrostÃ¡tica de Estallido (PSI).';
            // ValidaciÃ³n con presiÃ³n operativa mÃ¡xima
            const rawOpMax = (
                attrs.operating_pressure_max_psi ||
                attrs.maximum_operating_pressure ||
                attrs.working_pressure ||
                attrs.operating_pressure_max ||
                ''
            );
            const opMax = normalizePressureToPsi(rawOpMax);
            if (!isNaN(opMax) && opMax > 0) {
                if (burst <= opMax * 1.5) return 'âš ï¸ Burst cercano a presiÃ³n operativa; debe ser significativamente mayor.';
            }
            // Coherencia con presiÃ³n de bypass
            const rawBypass = (
                attrs.bypass_valve_psi ||
                attrs.bypass_valve_setting ||
                attrs.relief_valve_pressure ||
                attrs.relief_pressure ||
                attrs.presion_derivacion ||
                attrs['presiÃ³n de derivaciÃ³n'] ||
                attrs['presion de derivacion'] ||
                ''
            );
            const bypass = normalizePressureToPsi(rawBypass);
            if (!isNaN(bypass) && bypass > 0) {
                if (burst <= (bypass + 100)) return 'âš ï¸ Burst insuficiente respecto a bypass; debe exceder ampliamente.';
            }
            // Umbral tÃ­pico mÃ­nimo
            if (burst < 250) return 'âš ï¸ Burst muy bajo (tÃ­picamente >250 PSI en HD).';
            return '';
        })(),
        dirt_capacity_grams: (() => {
            const applicable = new Set(['AIR', 'OIL', 'FUEL', 'HYDRAULIC']);
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
            const applicable = new Set(['AIR', 'OIL', 'FUEL', 'HYDRAULIC']);
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
            const applicable = new Set(['AIR', 'OIL', 'FUEL', 'HYDRAULIC']);
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
            if (!hasValue) return 'âš ï¸ Falta Capacidad de Suciedad (g).';
            // HeurÃ­stica de coherencia con tecnologÃ­a premium
            const mediaRaw = (
                attrs.media_type ||
                attrs.media ||
                attrs.technology ||
                attrs['tecnologÃ­a'] ||
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
                if (isMacrocore && num < 300) return 'âš ï¸ Capacidad de Suciedad baja para MACROCOREâ„¢.';
                if (isElimtek && isSynUltra && num < 200) return 'âš ï¸ Capacidad de Suciedad baja para ELIMTEKâ„¢ ULTRA/SYNTHETIC.';
            }
            return '';
        })(),
        // Peso del filtro (Columna AD): normaliza y convierte a gramos
        weight_grams: (() => {
            const applicable = new Set(['AIR', 'OIL', 'FUEL', 'HYDRAULIC', 'CABIN', 'COOLANT']);
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
            const applicable = new Set(['AIR', 'OIL', 'FUEL', 'HYDRAULIC', 'CABIN', 'COOLANT']);
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
            const applicable = new Set(['AIR', 'OIL', 'FUEL', 'HYDRAULIC', 'CABIN', 'COOLANT']);
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
            if (!hasValue) return 'âš ï¸ Falta Peso del Filtro (g).';
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
            // HeurÃ­stica por familia
            if (familyPrefix === 'CABIN' && grams > 1500) {
                return 'âš ï¸ Peso alto para CABIN; revisar coherencia.';
            }
            if (familyPrefix === 'OIL' && String((data.duty || attrs.duty || '')).toUpperCase() === 'HD' && grams < 800) {
                return 'âš ï¸ Peso bajo para OIL HD; revisar coherencia.';
            }
            // Coherencia con dimensiones (si disponibles)
            const hStr = String(attrs.height_mm || attrs.height || attrs.overall_height || attrs.total_length || '').trim();
            const odStr = String(attrs.outer_diameter_mm || attrs.outer_diameter || '').trim();
            const h = parseFloat(normalizeMM(hStr) || '');
            const od = parseFloat(normalizeMM(odStr) || '');
            if (!isNaN(h) && !isNaN(od)) {
                const scale = h * od; // mm^2 como mÃ©trica aproximada
                if (scale > 30000 && grams < 300) return 'âš ï¸ Peso bajo para dimensiones grandes; revisar.';
                if (scale < 10000 && grams > 1500) return 'âš ï¸ Peso alto para dimensiones pequeÃ±as; revisar.';
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
                        return 'âš ï¸ Peso bajo respecto a capacidad de suciedad; revisar.';
                    }
                }
            }
            return '';
        })(),
        rated_flow_gpm: (() => {
            const applicable = new Set(['OIL', 'FUEL', 'HYDRAULIC', 'COOLANT']);
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
            else if (/(m3\/h|mÂ³\/h|metros\s*cÃºbicos\/hora)/.test(lower)) gpm = (n * 16.6667) * 0.26417; // m3/h -> LPM -> GPM
            // Default assumes GPM
            return Math.round(gpm * 100) / 100;
        })(),
        rated_flow_gpm_indice_mongo: (() => {
            const applicable = new Set(['OIL', 'FUEL', 'HYDRAULIC', 'COOLANT']);
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
            else if (/(m3\/h|mÂ³\/h|metros\s*cÃºbicos\/hora)/.test(lower)) gpm = (n * 16.6667) * 0.26417;
            return Math.round(gpm * 100) / 100;
        })(),
        rated_flow_quality_flag: (() => {
            const applicable = new Set(['OIL', 'FUEL', 'HYDRAULIC', 'COOLANT']);
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
            if (!hasValue) return 'âš ï¸ Falta Flujo Nominal (GPM).';
            // HeurÃ­stica: lÃ­neas ELIMTEKâ„¢ SYNTHETIC/ULTRA deberÃ­an tener flujo superior
            const mediaRaw = (
                attrs.media_type ||
                attrs.media ||
                attrs.technology ||
                attrs['tecnologÃ­a'] ||
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
                else if (/(m3\/h|mÂ³\/h|metros\s*cÃºbicos\/hora)/.test(lower)) v = (n * 16.6667) * 0.26417;
                return v;
            })();
            const isElimtek = media.includes('elimtek');
            const isSynUltra = media.includes('synthetic') || media.includes('ultra');
            if (!isNaN(gpm) && isElimtek && isSynUltra && gpm < 10) {
                return 'âš ï¸ Flujo Nominal bajo para ELIMTEKâ„¢ ULTRA/SYNTHETIC.';
            }
            return '';
        })(),
        rated_flow_cfm: (() => {
            const applicable = new Set(['AIR', 'AIR DRYER']);
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
                attrs['mÂ³/min'] ||
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
            if (/(m3\/min|mÂ³\/min)/.test(lower)) cfm = n * 35.315;
            else if (/(l\/s|l\s*s|litros\/seg|litros por segundo)/.test(lower)) cfm = n * 2.11888;
            else if (/(l\/min|l\s*min|litros\/min|litros por minuto)/.test(lower)) cfm = n * 0.0353147;
            else if (/(m3\/h|mÂ³\/h|metros\s*cÃºbicos\/hora)/.test(lower)) cfm = n * 0.588577;
            // SCFM/CFM default treated as CFM numeric
            return Math.round(cfm * 100) / 100;
        })(),
        rated_flow_cfm_indice_mongo: (() => {
            const applicable = new Set(['AIR', 'AIR DRYER']);
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
                attrs['mÂ³/min'] ||
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
            if (/(m3\/min|mÂ³\/min)/.test(lower)) cfm = n * 35.315;
            else if (/(l\/s|l\s*s|litros\/seg|litros por segundo)/.test(lower)) cfm = n * 2.11888;
            else if (/(l\/min|l\s*min|litros\/min|litros por minuto)/.test(lower)) cfm = n * 0.0353147;
            else if (/(m3\/h|mÂ³\/h|metros\s*cÃºbicos\/hora)/.test(lower)) cfm = n * 0.588577;
            return Math.round(cfm * 100) / 100;
        })(),
        rated_flow_air_quality_flag: (() => {
            const applicable = new Set(['AIR', 'AIR DRYER']);
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
                attrs['mÂ³/min'] ||
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
            if (!hasValue) return 'âš ï¸ Falta Flujo Nominal de Aire (CFM).';
            const mediaRaw = (
                attrs.media_type ||
                attrs.media ||
                attrs.technology ||
                attrs['tecnologÃ­a'] ||
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
                if (/(m3\/min|mÂ³\/min)/.test(lower)) v = n * 35.315;
                else if (/(l\/s|l\s*s|litros\/seg|litros por segundo)/.test(lower)) v = n * 2.11888;
                else if (/(l\/min|l\s*min|litros\/min|litros por minuto)/.test(lower)) v = n * 0.0353147;
                else if (/(m3\/h|mÂ³\/h|metros\s*cÃºbicos\/hora)/.test(lower)) v = n * 0.588577;
                return v;
            })();
            const isMacrocore = media.includes('macrocore');
            if (!isNaN(cfm) && isMacrocore && cfm < 250) {
                return 'âš ï¸ Flujo de Aire bajo para MACROCOREâ„¢.';
            }
            return '';
        })(),
        operating_pressure_min_psi: (() => {
            const applicable = new Set(['HYDRAULIC', 'FUEL']);
            if (!applicable.has(familyPrefix)) return '';
            const raw = (
                attrs.operating_pressure_min_psi ||
                attrs.min_operating_pressure ||
                attrs.low_pressure_rating ||
                attrs['Min Operating Pressure'] ||
                attrs['Low Pressure Rating'] ||
                attrs['PresiÃ³n MÃ­nima de OperaciÃ³n'] ||
                attrs['PresiÃ³n MÃ­n'] ||
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
            const applicable = new Set(['HYDRAULIC', 'FUEL']);
            if (!applicable.has(familyPrefix)) return undefined;
            const raw = (
                attrs.operating_pressure_min_psi ||
                attrs.min_operating_pressure ||
                attrs.low_pressure_rating ||
                attrs['Min Operating Pressure'] ||
                attrs['Low Pressure Rating'] ||
                attrs['PresiÃ³n MÃ­nima de OperaciÃ³n'] ||
                attrs['PresiÃ³n MÃ­n'] ||
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
            const applicable = new Set(['HYDRAULIC', 'FUEL']);
            if (!applicable.has(familyPrefix)) return '';
            const raw = (
                attrs.operating_pressure_min_psi ||
                attrs.min_operating_pressure ||
                attrs.low_pressure_rating ||
                attrs['Min Operating Pressure'] ||
                attrs['Low Pressure Rating'] ||
                attrs['PresiÃ³n MÃ­nima de OperaciÃ³n'] ||
                attrs['PresiÃ³n MÃ­n'] ||
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
            if (!hasValue) return 'âš ï¸ Falta PresiÃ³n MÃ­nima de OperaciÃ³n (PSI).';
            // Coherencia con bypass: la presiÃ³n mÃ­nima no debe ser >= bypass
            const bypassRaw = (
                attrs.bypass_valve_psi ||
                attrs.bypass_valve_setting ||
                attrs.bypass ||
                attrs['Bypass Valve'] ||
                attrs['VÃ¡lvula Bypass'] ||
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
                return 'âš ï¸ PresiÃ³n mÃ­nima â‰¥ bypass; revisar coherencia.';
            }
            return '';
        })(),
        operating_pressure_max_psi: (() => {
            const applicable = new Set(['HYDRAULIC', 'FUEL', 'OIL']);
            if (!applicable.has(familyPrefix)) return '';
            const raw = (
                attrs.operating_pressure_max_psi ||
                attrs.max_operating_pressure ||
                attrs.rated_pressure ||
                attrs['Max Operating Pressure'] ||
                attrs['Rated Pressure'] ||
                attrs['PresiÃ³n MÃ¡xima de OperaciÃ³n'] ||
                attrs['PresiÃ³n MÃ¡x'] ||
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
            const applicable = new Set(['HYDRAULIC', 'FUEL', 'OIL']);
            if (!applicable.has(familyPrefix)) return undefined;
            const raw = (
                attrs.operating_pressure_max_psi ||
                attrs.max_operating_pressure ||
                attrs.rated_pressure ||
                attrs['Max Operating Pressure'] ||
                attrs['Rated Pressure'] ||
                attrs['PresiÃ³n MÃ¡xima de OperaciÃ³n'] ||
                attrs['PresiÃ³n MÃ¡x'] ||
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
            const applicable = new Set(['HYDRAULIC', 'FUEL', 'OIL']);
            if (!applicable.has(familyPrefix)) return '';
            const raw = (
                attrs.operating_pressure_max_psi ||
                attrs.max_operating_pressure ||
                attrs.rated_pressure ||
                attrs['Max Operating Pressure'] ||
                attrs['Rated Pressure'] ||
                attrs['PresiÃ³n MÃ¡xima de OperaciÃ³n'] ||
                attrs['PresiÃ³n MÃ¡x'] ||
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
            if (!hasValue) return 'âš ï¸ Falta PresiÃ³n MÃ¡xima de OperaciÃ³n (PSI).';
            // Coherencia con Burst: max debe ser < burst
            const burstRaw = (
                attrs.hydrostatic_burst_psi ||
                attrs.hydrostatic_burst ||
                attrs.burst_pressure ||
                attrs['Hydrostatic Burst'] ||
                attrs['Burst Pressure'] ||
                attrs['PresiÃ³n de Estallido'] ||
                ''
            );
            const burstPsi = normalizePressureToPsi(burstRaw);
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
                if (maxPsi >= burstPsi) return 'âš ï¸ PresiÃ³n MÃ¡xima â‰¥ Estallido; incoherente.';
                if (maxPsi > burstPsi * 0.7) return 'âš ï¸ PresiÃ³n MÃ¡xima muy cercana a Estallido; factor de seguridad bajo.';
            }
            // HeurÃ­stica por prefijo: HYDRAULIC suele tener valores altos
            if (familyPrefix === 'HYDRAULIC' && !isNaN(maxPsi) && maxPsi < 500) {
                return 'âš ï¸ PresiÃ³n MÃ¡xima baja para HYDRAULIC; revisar especificaciÃ³n.';
            }
            return '';
        })(),
        beta_200_indice_mongo: (() => {
            const applicable = new Set(['OIL', 'FUEL', 'HYDRAULIC']);
            if (!applicable.has(familyPrefix)) return undefined;
            const raw = (
                attrs.beta_200 ||
                attrs.beta_ratio ||
                attrs.beta_value ||
                attrs['beta 200'] ||
                attrs['beta200'] ||
                attrs['Î²200'] ||
                attrs.beta ||
                ''
            );
            const val = normalizeBetaRatio(raw);
            return isNaN(val) || val <= 0 ? undefined : Number(val);
        })(),
        beta_200_quality_flag: (() => {
            const applicable = new Set(['OIL', 'FUEL', 'HYDRAULIC']);
            if (!applicable.has(familyPrefix)) return '';
            const raw = (
                attrs.beta_200 ||
                attrs.beta_ratio ||
                attrs.beta_value ||
                attrs['beta 200'] ||
                attrs['beta200'] ||
                attrs['Î²200'] ||
                attrs.beta ||
                ''
            );
            const val = normalizeBetaRatio(raw);
            if (isNaN(val) || val <= 0) return 'âš ï¸ Falta Beta 200 (mandatorio en filtros de fase lÃ­quida).';
            const highEfficiencyLine = /ULTRA|SYNTHETIC/i.test(String(lineSuffix || ''));
            if (highEfficiencyLine && val < 75) return 'âš ï¸ Beta bajo para lÃ­nea ULTRA/SYNTHETIC (<75).';
            return '';
        })(),
        gasket_od_mm_indice_mongo: (() => {
            const liquidFamilies = new Set(['OIL', 'FUEL', 'HYDRAULIC', 'COOLANT']);
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
                attrs['diÃ¡metro exterior junta'] ||
                attrs['diÃ¡metro exterior de junta'] ||
                ''
            );
            const val = parseFloat(valStr || '');
            return isNaN(val) ? undefined : Number(val.toFixed(2));
        })(),
        gasket_od_quality_flag: (() => {
            const liquidFamilies = new Set(['OIL', 'FUEL', 'HYDRAULIC', 'COOLANT']);
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
                attrs['diÃ¡metro exterior junta'] ||
                attrs['diÃ¡metro exterior de junta'] ||
                ''
            );
            const gasketVal = parseFloat(gasketStr || '');
            if (isNaN(gasketVal)) return 'âš ï¸ Falta Gasket OD para diseÃ±o spin-on en familia lÃ­quida.';
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
            if (!isNaN(od) && gasketVal >= od) return 'âš ï¸ Gasket OD debe ser menor que el diÃ¡metro exterior.';
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
                return 'âš ï¸ Gasket OD debe ser mayor que el diÃ¡metro de rosca.';
            }
            return '';
        })(),
        gasket_id_mm_indice_mongo: (() => {
            const liquidFamilies = new Set(['OIL', 'FUEL', 'HYDRAULIC', 'COOLANT']);
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
                attrs['diÃ¡metro interior junta'] ||
                attrs['diÃ¡metro interior de junta'] ||
                ''
            );
            const val = parseFloat(valStr || '');
            return isNaN(val) ? undefined : Number(val.toFixed(2));
        })(),
        gasket_id_quality_flag: (() => {
            const liquidFamilies = new Set(['OIL', 'FUEL', 'HYDRAULIC', 'COOLANT']);
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
                attrs['diÃ¡metro interior junta'] ||
                attrs['diÃ¡metro interior de junta'] ||
                ''
            );
            const idVal = parseFloat(idStr || '');
            if (isNaN(idVal)) return 'âš ï¸ Falta Gasket ID para diseÃ±o spin-on en familia lÃ­quida.';
            const odStr = normalizeMM(
                attrs.gasket_od_mm ||
                attrs.gasket_od ||
                attrs['gasket od'] ||
                attrs.seal_od ||
                attrs['seal od'] ||
                attrs.gasket_outer_diameter ||
                attrs['gasket outer diameter'] ||
                attrs.diametro_exterior_junta ||
                attrs['diÃ¡metro exterior junta'] ||
                attrs['diÃ¡metro exterior de junta'] ||
                ''
            );
            const odVal = parseFloat(odStr || '');
            if (!isNaN(odVal) && idVal >= odVal) return 'âš ï¸ Gasket ID debe ser menor que Gasket OD.';
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
                return 'âš ï¸ Gasket ID debe ser mayor o muy cercano al diÃ¡metro de rosca.';
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
            const liquidFamilies = new Set(['OIL', 'FUEL', 'COOLANT', 'HYDRAULIC']);
            if (!liquidFamilies.has(familyPrefix)) return undefined;
            if (familyPrefix === 'AIR' || familyPrefix === 'CABIN') return undefined;
            if (!isSpinOnDesign && !norm) return undefined;
            return norm || undefined;
        })()
    };
}

// ============================================================================
// COMPLETENESS DEFAULTS
// Rellena siempre todas las columnas según familia de filtro
// ============================================================================
function ensureRowCompleteness(row) {
    try {
        const family = String(row.family || row.filter_type || '').toUpperCase();
        const isAir = family === 'AIR' || family === 'CABIN';
        const isLiquid = family === 'FUEL' || family === 'OIL' || family === 'HYDRAULIC' || family === 'COOLANT';
        const isAirDryer = family === 'AIR DRYER';

        const defIfEmpty = (key, val) => {
            const cur = row[key];
            if (cur === undefined || cur === null || (typeof cur === 'string' && cur.trim() === '')) {
                row[key] = val;
            }
        };

        const numericDefaults = [
            'height_mm', 'outer_diameter_mm',
            'gasket_od_mm', 'gasket_id_mm', 'bypass_valve_psi', 'beta_200', 'hydrostatic_burst_psi', 'dirt_capacity_grams',
            'rated_flow_gpm', 'rated_flow_cfm', 'operating_pressure_min_psi', 'operating_pressure_max_psi', 'weight_grams',
            'panel_width_mm', 'panel_depth_mm', 'water_separation_efficiency_percent', 'inner_diameter_mm', 'pleat_count',
            'iso_main_efficiency_percent', 'service_life_hours', 'change_interval_km'
        ];
        for (const k of numericDefaults) defIfEmpty(k, 0);

        // Strings neutrales
        const stringDefaults = [
            'thread_size', 'drain_type', 'seal_material', 'housing_material', 'iso_test_method',
            'manufacturing_standards', 'certification_standards', 'equipment_applications', 'engine_applications',
            'technology_name', 'technology_tier', 'technology_scope', 'technology_equivalents', 'technology_oem_detected'
        ];
        for (const k of stringDefaults) defIfEmpty(k, 'N/A');

        // Media y tecnología por familia
        if (isAir) {
            defIfEmpty('disposal_method', 'Residuo No Peligroso');
            defIfEmpty('rated_flow_cfm', 0);
            defIfEmpty('media_type', getProductMedia('AIR'));
            row['tecnologia_aplicada'] = getProductTechnology(family === 'CABIN' ? 'CABIN' : 'AIR', row.duty_type, row.normsku || '');
        } else if (isLiquid) {
            defIfEmpty('disposal_method', 'Residuo Peligroso');
            defIfEmpty('rated_flow_gpm', 0);
            defIfEmpty('media_type', getProductMedia('FUEL'));
            row['tecnologia_aplicada'] = getProductTechnology(family || 'FUEL', row.duty_type, row.normsku || '');
        } else if (isAirDryer) {
            defIfEmpty('disposal_method', 'Residuo Peligroso');
            defIfEmpty('media_type', getProductMedia('AIR'));
            row['tecnologia_aplicada'] = getProductTechnology('AIR_DRYER', row.duty_type, row.normsku || '');
        } else {
            // Fallback para familias no clasificadas: asignar tecnología canónica
            defIfEmpty('disposal_method', 'N/A');
            defIfEmpty('media_type', getProductMedia(family || ''));
            row['tecnologia_aplicada'] = getProductTechnology(family || '', row.duty_type, row.normsku || '');
        }

        // Regla canónica para AIRE Radial Seal (HD): estandarizar media y descripción
        try {
            const dutyUp = String(row.duty_type || row.duty || '').toUpperCase();
            const subtypeUp = String(row.subtype || '').toUpperCase();
            const familyUp = String(row.family || row.filter_type || '').toUpperCase();
            // Aplicar solo a familia AIR (excluir CABIN)
            if (familyUp === 'AIR' && dutyUp === 'HD' && /RADIAL/.test(subtypeUp)) {
                // Media y tecnología ELIMFILTERS para aire HD
                row.media_type = 'MACROCORE™';
                row.tecnologia_aplicada = 'MACROCORE™ NanoMax';
                // Descripción canónica en español
                row.description = 'Filtro de aire primario de servicio pesado, con sello radial. diseñado por ELIMFILTERS para mantener un flujo de aire estable y proteger el sistema de admisión. al capturar contaminantes antes de que alcancen la cámara de combustión. con tecnología MACROCORE™ diseñada con algoritmos inteligentes.';
            }

            // Regla canónica por tipo CABIN (Cabina)
            if (/\bCABIN(A)?\b/.test(familyUp)) {
                const isCarbon = /CARBON|CARBÓN|ACTIVATED|ACTIVADO/.test(subtypeUp);
                row.media_type = 'MICROKAPPA™';
                row.tecnologia_aplicada = isCarbon ? 'MICROKAPPA™ Carbon' : 'MICROKAPPA™ Particulate';
                row.description = isCarbon
                    ? 'Filtro de cabina con carbón activado para purificar el aire del habitáculo, captura partículas ultrafinas y neutraliza olores y gases.'
                    : 'Filtro de cabina particulado para purificar el aire del habitáculo, captura polvo, polen y partículas finas para mayor confort.';
            }

            // Regla canónica por tipo FUEL (Combustible)
            if (familyUp === 'FUEL') {
                const isSeparator = /SEPARADOR|SEPARATOR|COALESC|WATER/.test(subtypeUp);
                if (isSeparator) {
                    row.media_type = 'AquaCore Pro';
                    row.tecnologia_aplicada = 'AquaCore Pro';
                    row.description = 'Filtro separador/coalescente de combustible, maximiza la separación de agua y protege el sistema de inyección de alta presión.';
                } else {
                    row.media_type = 'ELIMTEK™';
                    row.tecnologia_aplicada = dutyUp === 'HD' ? 'ELIMTEK™ MultiCore' : 'ELIMTEK™ Blend';
                    row.description = 'Filtro de combustible de servicio ' + (dutyUp === 'HD' ? 'pesado' : 'ligero') + ', diseñado para eficiencia estable y protección del sistema de inyección.';
                }
            }

            // Regla canónica por tipo OIL (Aceite)
            if (familyUp === 'OIL') {
                const isBypass = /BYPASS/.test(subtypeUp);
                row.media_type = 'ELIMTEK™';
                row.tecnologia_aplicada = dutyUp === 'HD' ? 'ELIMTEK™ MultiCore' : 'ELIMTEK™ Blend';
                row.description = isBypass
                    ? 'Filtro de aceite tipo bypass para limpieza fina del lubricante, optimiza la vida del motor en servicio ' + (dutyUp === 'HD' ? 'pesado' : 'ligero') + '.'
                    : 'Filtro de aceite de flujo total para protección del motor, mantiene limpieza y desempeño en servicio ' + (dutyUp === 'HD' ? 'pesado' : 'ligero') + '.';
            }

            // Regla canónica por tipo HYDRAULIC (Hidráulico)
            if (familyUp === 'HYDRAULIC') {
                row.media_type = 'HydroFlow 5000';
                row.tecnologia_aplicada = 'HydroFlow 5000';
                row.description = 'Filtro hidráulico de alta eficiencia para sistemas de trabajo pesado, mantiene pureza ISO y protege componentes críticos.';
            }

            // Regla canónica por tipo COOLANT (Refrigerante)
            if (familyUp === 'COOLANT') {
                row.media_type = 'ThermoRelease™';
                row.tecnologia_aplicada = 'ThermoRelease™';
                row.description = 'Filtro de refrigerante con sistema de liberación controlada de aditivos, previene corrosión y cavitación en el sistema.';
            }

            // Regla canónica por tipo AIR DRYER (Secador de Aire)
            if (familyUp === 'AIR DRYER') {
                row.media_type = 'AeroDry Max';
                row.tecnologia_aplicada = 'AeroDry Max';
                row.description = 'Cartucho desecante para sistemas de frenos, remueve humedad del aire comprimido y mejora la fiabilidad del sistema.';
            }
        } catch (_) { }

        // Códigos y referencias: siempre texto neutro si faltan
        defIfEmpty('oem_codes', 'N/A');
        // Mantener "Multi-Referencia OEM" si ya fue asignado en mapeo; si falta, usar N/A
        if (!(String(row.cross_reference || '').trim())) {
            row.cross_reference = 'N/A';
        }

        // Temperaturas por familia (fallback inteligente controlado por env)
        const fallbackEnabled = String(process.env.FALLBACK_TEMP_ENABLED || 'true').toLowerCase() === 'true';
        const numOrZero = (v) => {
            const n = parseFloat(String(v));
            return isFinite(n) ? n : 0;
        };
        const setTempIfMissing = (minVal, maxVal) => {
            const minCur = numOrZero(row.operating_temperature_min_c);
            const maxCur = numOrZero(row.operating_temperature_max_c);
            if (fallbackEnabled) {
                if (!minCur || minCur === 0) row.operating_temperature_min_c = minVal;
                if (!maxCur || maxCur === 0) row.operating_temperature_max_c = maxVal;
            }
        };
        if (fallbackEnabled) {
            if (family === 'OIL') setTempIfMissing(-20, 150);
            else if (family === 'FUEL') setTempIfMissing(-20, 120);
            else if (family === 'AIR' || family === 'CABIN') setTempIfMissing(-40, 120);
            else if (family === 'HYDRAULIC') setTempIfMissing(-20, 110);
            else if (family === 'COOLANT') setTempIfMissing(-40, 125);
            else if (family === 'AIR DRYER') setTempIfMissing(-40, 105);
        }

        // Garantizar que todos los headers existen
        for (const h of DESIRED_HEADERS) {
            if (!(h in row)) {
                // Asignar por tipo básico
                if (numericDefaults.includes(h)) row[h] = 0; else row[h] = 'N/A';
            }
        }
    } catch (_) { }
    return row;
}

// ============================================================================
// VALIDACIÓN DE CAMPOS ESENCIALES
// Bloquea escritura si faltan datos críticos por familia
// ============================================================================
function textContainsAny(str, keywords) {
    const s = String(str || '').toLowerCase();
    return keywords.some(k => s.includes(String(k).toLowerCase()));
}

function isFuelWaterSeparator(row) {
    const family = String(row.family || row.filter_type || '').toUpperCase();
    if (!['FUEL', 'FUEL SEPARATOR'].includes(family)) return false;
    const keys = ['subtype', 'description', 'media_type'];
    const kw = ['water', 'separ', 'separador', 'separation', 'agua'];
    return keys.some(k => textContainsAny(row[k], kw));
}

// Heurística: detectar diseño Spin-On por texto
function isSpinOnDesignHint(row) {
    const keys = ['subtype', 'description'];
    // Palabras clave más estrictas para evitar falsos positivos
    const kw = ['spin-on', 'spin on', 'rosca', 'roscado', 'unf ', 'm\"', 'mm x', ' x tpi'];
    return keys.some(k => textContainsAny(row[k], kw));
}

function validateEssentialFields(row) {
    const missing = [];
    const family = String(row.family || row.filter_type || '').toUpperCase();
    const numVal = (v) => {
        const n = parseFloat(String(v));
        return isFinite(n) ? n : 0;
    };
    const hasText = (v) => {
        const s = String(v || '').trim();
        const low = s.toLowerCase();
        return s.length > 0 && low !== 'sin datos' && low !== 'n/a';
    };
    const spinOnHint = isSpinOnDesignHint(row);

    if (family === 'OIL') {
        if (numVal(row.height_mm) <= 0) missing.push('height_mm');
        if (numVal(row.outer_diameter_mm) <= 0) missing.push('outer_diameter_mm');
        // Sólo exigir rosca cuando el diseño sugiere Spin‑On
        if (spinOnHint && !hasText(row.thread_size)) missing.push('thread_size');
    } else if (family === 'AIR') {
        const okHeight = numVal(row.height_mm) > 0 || numVal(row.panel_width_mm) > 0;
        if (!okHeight) missing.push('height_mm|panel_width_mm');
        if (numVal(row.outer_diameter_mm) <= 0) missing.push('outer_diameter_mm');
    } else if (family === 'FUEL') {
        // Altura recomendada, pero no bloqueante en mínimos
        if (spinOnHint && numVal(row.height_mm) <= 0) missing.push('height_mm');
        // Sólo exigir rosca si el diseño sugiere Spin‑On
        if (spinOnHint && !hasText(row.thread_size)) missing.push('thread_size');
        // La eficiencia de separación de agua se reporta como bandera, no bloquea escritura mínima
    } else if (family === 'HYDRAULIC') {
        if (spinOnHint && numVal(row.height_mm) <= 0) missing.push('height_mm');
        if (spinOnHint && !hasText(row.thread_size)) missing.push('thread_size');
        // Micron rating útil, pero no debe bloquear upserts mínimos
    }

    if (missing.length > 0) {
        const sku = String(row.normsku || row.query || '').toUpperCase();
        const msg = `Error de Enriquecimiento: Campo esencial [${missing.join(', ')}] vacío para SKU [${sku}]`;
        const err = new Error(msg);
        err.code = 'ESSENTIALS_VALIDATION_FAILED';
        throw err;
    }
}

/**
 * Append single filter to Google Sheets Master
 * @param {object} data - Filter data to append
 */
async function appendToSheet(data) {
    try {
        // Server-only policy: suppress TURBINE SERIES from Master sheet before any external I/O
        try {
            const famUpEarly = String(data.family || '').toUpperCase();
            const typeUpEarly = String(data.filter_type || data.type || '').toUpperCase();
            if (famUpEarly === 'TURBINE SERIES' || typeUpEarly === 'TURBINE SERIES') {
                console.log('🚫 Suppressed TURBINE SERIES for Master (server-only logic retained).');
                return { suppressed: true };
            }
        } catch (_) { /* no-op */ }
        const doc = await initSheet();
        const sheet = doc.sheetsByIndex[0];
        await ensureHeaders(sheet);
        const rowData = buildRowData(data);
        // Enforce SKU creation policy invariant (robust guard at write-time)
        try {
            const { enforceSkuPolicyInvariant } = require('./skuCreationPolicy');
            const { resolveBrandFamilyDutyByPrefix } = require('../config/prefixMap');
            const codeForDigits = String(
                data.code_oem || data.oem_equivalent || data.query_normalized || data.query || data.sku || ''
            );
            // Prefer explicit family/duty; otherwise infer deterministically from prefix rules
            const hint = resolveBrandFamilyDutyByPrefix(codeForDigits) || {};
            const family = String(data.family || hint.family || '').toUpperCase();
            const duty = String(data.duty || hint.duty || '').toUpperCase();
            const payloadForPolicy = {
                sku: data.sku,
                family,
                duty,
                source: String(data.source || rowData.source || '').toUpperCase(),
                code_oem: data.code_oem,
                oem_equivalent: data.oem_equivalent,
                query_normalized: data.query_normalized,
                query: data.query
            };
            // Proveer código homologado para extracción de últimos 4 según fuente
            try {
                const srcUp = String(payloadForPolicy.source || '').toUpperCase();
                const homologatedCode = (
                    srcUp === 'FRAM'
                        ? (data.fram_code || data.homologated_code || data.code_oem)
                        : (srcUp === 'DONALDSON'
                            ? (data.donaldson_code || data.homologated_code || data.code_oem)
                            : '')
                );
                if (homologatedCode) {
                    payloadForPolicy.homologated_code = homologatedCode;
                }
            } catch (_) { }
            // Allow marine specialized families to pass via dedicated generators
            if (!/^(EM9|ET9)/.test(String(data.sku || ''))) {
                const resPolicy = enforceSkuPolicyInvariant(payloadForPolicy);
                if (!resPolicy.ok) {
                    throw new Error(`SKU policy violation: ${resPolicy.error}`);
                }
            }
        } catch (policyErr) {
            // If policy fails, block write to ensure invariants are never bypassed
            if (policyErr && policyErr.message) {
                throw policyErr;
            }
            throw new Error('SKU policy enforcement failed unexpectedly');
        }
        // Validar antes de completar defaults. Si faltan esenciales, degradar a modo mínimo.
        let skipValidationAppend = data && data.minimal === true;
        if (!skipValidationAppend) {
            try {
                validateEssentialFields(rowData);
            } catch (err) {
                if (err && err.code === 'ESSENTIALS_VALIDATION_FAILED') {
                    const fam = String(rowData.family || rowData.filter_type || '').toUpperCase();
                    const allowedMinimal = new Set(['OIL', 'FUEL', 'HYDRAULIC', 'COOLANT']);
                    if (allowedMinimal.has(fam)) {
                        console.warn(`⚠️ Escritura mínima por faltantes esenciales (${fam}): ${err.message}`);
                        skipValidationAppend = true; // degradar a modo mínimo
                    } else {
                        throw err;
                    }
                } else {
                    throw err;
                }
            }
        }
        const finalized = ensureRowCompleteness(rowData);
        await sheet.addRow(finalized);
        console.log(`ðŸ’¾ Saved to Google Sheet Master: ${data.sku}`);
    } catch (error) {
        console.error('âŒ Error appending to Google Sheet:', error.message);
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
        // Server-only policy: suppress TURBINE SERIES from Master sheet before any external I/O
        try {
            const famUpEarly = String(data.family || '').toUpperCase();
            const typeUpEarly = String(data.filter_type || data.type || '').toUpperCase();
            if (famUpEarly === 'TURBINE SERIES' || typeUpEarly === 'TURBINE SERIES') {
                console.log('🚫 Suppressed TURBINE SERIES for Master (server-only logic retained).');
                return { suppressed: true };
            }
        } catch (_) { /* no-op */ }
        const doc = await initSheet();
        const sheet = doc.sheetsByIndex[0];
        await ensureHeaders(sheet);
        const rows = await sheet.getRows();
        const skuNorm = (data.sku || '').toUpperCase().trim();
        // Some environments expose row values directly by header name, avoiding row.get()
        const matches = rows.filter(r => (r.normsku || '').toUpperCase().trim() === skuNorm);

        const rowData = buildRowData(data);
        // Validación previa a escritura. Si faltan esenciales, degradar a modo mínimo automáticamente.
        let skipValidationUpsert = data && data.minimal === true;
        if (!skipValidationUpsert) {
            try {
                validateEssentialFields(rowData);
            } catch (err) {
                if (err && err.code === 'ESSENTIALS_VALIDATION_FAILED') {
                    const fam = String(rowData.family || rowData.filter_type || '').toUpperCase();
                    const allowedMinimal = new Set(['OIL', 'FUEL', 'HYDRAULIC', 'COOLANT']);
                    if (allowedMinimal.has(fam)) {
                        console.warn(`⚠️ Upsert en modo mínimo por faltantes esenciales (${fam}): ${err.message}`);
                        skipValidationUpsert = true; // degradar a modo mínimo
                    } else {
                        throw err;
                    }
                } else {
                    throw err;
                }
            }
            // Enforce inviolable SKU creation policy: no inventar/adivinar fuera de norma
            try {
                const { enforceSkuPolicyInvariant } = require('./skuCreationPolicy');
                const policyPayload = {
                    sku: skuNorm,
                    family: String(data.family || rowData.type || '').toUpperCase(),
                    duty: String(data.duty || rowData.duty_type || '').toUpperCase(),
                    source: String(data.source || '').toUpperCase(),
                    code_oem: String(data.code_oem || '').toUpperCase(),
                    query_normalized: String(data.query_normalized || rowData.query || '').toUpperCase(),
                    homologated_code: String(data.homologated_code || '').toUpperCase(),
                    donaldson_code: String(data.donaldson_code || '').toUpperCase(),
                    fram_code: String(data.fram_code || '').toUpperCase()
                };
                const policyRes = enforceSkuPolicyInvariant(policyPayload);
                if (!policyRes || policyRes.ok !== true) {
                    const reason = (policyRes && policyRes.error) ? policyRes.error : 'SKU policy violation';
                    console.warn(`🛑 Bloqueado por política de SKU: ${reason}`);
                    return false;
                }
            } catch (e) {
                console.warn(`⚠️ No se pudo aplicar la política de SKU: ${e && e.message ? e.message : e}`);
            }
        }

        // -------- HD invariant guard ---------------------------------------
        // En HD, si el mismo query normalizado ya está mapeado a un SKU distinto,
        // preferimos el existente y NO creamos/insertamos un SKU similar.
        try {
            const dutyType = String(data.duty || rowData.duty_type || '').toUpperCase();
            const queryNormIncoming = String(
                data.query_normalized || rowData.query || skuNorm
            ).toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (dutyType === 'HD' && queryNormIncoming) {
                const conflict = rows.find(r => {
                    const q = String(r.query || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
                    const s = String(r.normsku || '').toUpperCase().trim();
                    return q === queryNormIncoming && s && s !== skuNorm;
                });
                if (conflict) {
                    const existingSku = String(conflict.normsku || '').toUpperCase().trim();
                    console.warn(`🛑 HD invariant: query '${queryNormIncoming}' ya está mapeado al SKU '${existingSku}'. Se rechaza crear SKU similar '${skuNorm}'.`);
                    return false; // bloquea escritura de nuevos similares en HD
                }
            }
        } catch (invErr) {
            console.warn(`⚠️ No se pudo evaluar la invariante HD: ${invErr && invErr.message ? invErr.message : invErr}`);
        }
        // -------------------------------------------------------------------

        if (matches.length > 0) {
            const row = matches[0];
            // Assign all fields
            let finalized = ensureRowCompleteness(rowData);

            // Preservar campos aprobados que no deben cambiar una vez generados
            // Actualmente: description. Si la fila existente tiene un valor no vacío,
            // no se sobrescribe con el nuevo.
            try {
                const IMMUTABLE_FIELDS = ['description'];
                IMMUTABLE_FIELDS.forEach((field) => {
                    const existingVal = String(row[field] || '').trim();
                    if (existingVal) {
                        finalized[field] = existingVal;
                    }
                });
            } catch (_) { /* no-op */ }

            Object.entries(finalized).forEach(([k, v]) => { row[k] = v; });
            await row.save();
            console.log(`â™»ï¸ Upserted existing row for ${data.sku}`);

            if (options.deleteDuplicates && matches.length > 1) {
                for (let i = 1; i < matches.length; i++) {
                    try {
                        await matches[i].delete();
                        console.log(`ðŸ§¹ Deleted duplicate row for ${data.sku}`);
                    } catch (e) {
                        console.warn(`âš ï¸ Failed to delete duplicate for ${data.sku}: ${e.message}`);
                    }
                }
            }
        } else {
            const finalized = ensureRowCompleteness(rowData);
            await sheet.addRow(finalized);
            console.log(`âž• Inserted new row for ${data.sku}`);
        }
    } catch (error) {
        console.error('âŒ Error upserting to Google Sheet:', error.message);
        throw error;
    }
}

/**
 * Sync MongoDB to Google Sheets (if needed)
 */
async function syncToSheets(filters) {
    try {
        console.log('ðŸ”„ Starting sync to Google Sheets Master...');

        if (!filters || filters.length === 0) {
            console.log('âš ï¸  No filters to sync');
            return { success: false, message: 'No filters provided' };
        }

        const doc = await initSheet();
        const sheet = doc.sheetsByIndex[0];
        await ensureHeaders(sheet);

        console.log(`ðŸ“Š Syncing ${filters.length} filters...`);

        for (const filter of filters) {
            await upsertBySku(filter);
        }

        console.log(`âœ… Sync complete: ${filters.length} filters synced`);

        return {
            success: true,
            synced: filters.length,
            message: `Successfully synced ${filters.length} filters`
        };

    } catch (error) {
        console.error('âŒ Sync error:', error.message);
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

// =============================================================================
// BACKFILL: Completar columnas faltantes en Master con defaults y normalizaciones
// =============================================================================
async function backfillMissingMasterColumns() {
    try {
        const doc = await initSheet();
        const sheet = doc.sheetsByIndex[0];
        await ensureHeaders(sheet);

        const rows = await sheet.getRows();
        const headers = Array.isArray(sheet.headerValues) ? sheet.headerValues : [];

        // Solo columnas solicitadas para completar
        const TARGET_COLUMNS = [
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

        let updated = 0;

        for (const row of rows) {
            // Construir objeto plano con los valores actuales de la fila
            const obj = {};
            for (const h of headers) {
                obj[h] = row[h];
            }

            // Aplicar completitud basada en familia (defaults y normalizaciones ya definidas)
            const before = {};
            for (const key of TARGET_COLUMNS) before[key] = obj[key];
            const completed = ensureRowCompleteness(obj) || obj;

            // Actualizar sólo columnas objetivo cuando estén vacías y tengamos valor
            let changed = false;
            for (const key of TARGET_COLUMNS) {
                const cur = row[key];
                const isEmpty = cur === undefined || cur === null || (typeof cur === 'string' && cur.trim() === '');
                const val = completed[key];
                if (isEmpty && typeof val !== 'undefined') {
                    row[key] = val;
                    changed = true;
                }
            }

            if (changed) {
                await row.save();
                updated++;
            }
        }

        return { ok: true, total: rows.length, updated };
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
    // Kits EK5 helpers
    ensureSheetExists,
    upsertRow,
    saveKitToSheet,
    // Kits EK3 helper
    saveKitToSheetLD,
    // Export interno para pruebas y validaciones locales
    buildRowData,
    pingSheets,
    backfillMissingMasterColumns
};

