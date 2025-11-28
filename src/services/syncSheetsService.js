// ============================================================================
// GOOGLE SHEETS SYNC SERVICE - FINAL
// Google Sheet Master: 1ZYI5c0enkuvWAveu8HMaCUk1cek_VDrX8GtgKW7VP6U
// ============================================================================

const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

// ============================================================================
// CONFIGURATION
// ============================================================================

const SHEET_ID = '1ZYI5c0enkuvWAveu8HMaCUk1cek_VDrX8GtgKW7VP6U';

// Column mapping (exact headers from Sheet Master)
const COLUMNS = {
    QUERY_NORM: 'query_norm',
    SKU: 'sku',
    DESCRIPTION: 'description',
    FAMILY: 'family',
    DUTY: 'duty',
    OEM_CODES: 'oem_codes',
    CROSS_REFERENCE: 'cross_reference',
    MEDIA_TYPE: 'media_type',
    FILTER_TYPE: 'filter_type',
    SUBTYPE: 'subtype',
    ENGINE_APPLICATIONS: 'engine_applications',
    EQUIPMENT_APPLICATIONS: 'equipment_applications',
    HEIGHT_MM: 'height_mm',
    OUTER_DIAMETER_MM: 'outer_diameter_mm',
    THREAD_SIZE: 'thread_size',
    GASKET_OD_MM: 'gasket_od_mm',
    GASKET_ID_MM: 'gasket_id_mm',
    BYPASS_VALVE_PSI: 'bypass_valve_psi',
    MICRON_RATING: 'micron_rating',
    ISO_MAIN_EFFICIENCY_PERCENT: 'iso_main_efficiency_percent',
    ISO_TEST_METHOD: 'iso_test_method',
    BETA_200: 'beta_200',
    HYDROSTATIC_BURST_PSI: 'hydrostatic_burst_psi',
    DIRT_CAPACITY_GRAMS: 'dirt_capacity_grams',
    RATED_FLOW_CFM: 'rated_flow_cfm',
    RATED_FLOW_GPM: 'rated_flow_gpm',
    PANEL_WIDTH_MM: 'panel_width_mm',
    PANEL_DEPTH_MM: 'panel_depth_mm',
    MANUFACTURING_STANDARDS: 'manufacturing_standards',
    CERTIFICATION_STANDARDS: 'certification_standards',
    OPERATING_PRESSURE_MIN_PSI: 'operating_pressure_min_psi',
    OPERATING_PRESSURE_MAX_PSI: 'operating_pressure_max_psi',
    OPERATING_TEMPERATURE_MIN_C: 'operating_temperature_min_c',
    OPERATING_TEMPERATURE_MAX_C: 'operating_temperature_max_c',
    FLUID_COMPATIBILITY: 'fluid_compatibility',
    DISPOSAL_METHOD: 'disposal_method',
    WEIGHT_GRAMS: 'weight_grams',
    SERVICE_LIFE_HOURS: 'service_life_hours',
    CHANGE_INTERVAL_KM: 'change_interval_km',
    WATER_SEPARATION_EFFICIENCY_PERCENT: 'water_separation_efficiency_percent',
    DRAIN_TYPE: 'drain_type',
    OEM_NUMBER: 'oem_number',
    CROSS_BRAND: 'cross_brand',
    CROSS_PART_NUMBER: 'cross_part_number',
    MANUFACTURED_BY: 'manufactured_by',
    LAST4_SOURCE: 'last4_source',
    LAST4_DIGITS: 'last4_digits',
    SOURCE: 'source',
    HOMOLOGATED_SKU: 'homologated_sku',
    REVIEW: 'review',
    ALL_CROSS_REFERENCES: 'all_cross_references',
    SPECS: 'specs',
    PRIORITY_REFERENCE: 'priority_reference',
    PRIORITY_BRAND_REFERENCE: 'priority_brand_reference',
    OK: 'ok'
};

// ============================================================================
// AUTHENTICATION
// ============================================================================

async function initSheet() {
    try {
        const serviceAccountAuth = new JWT({
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const doc = new GoogleSpreadsheet(SHEET_ID, serviceAccountAuth);
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

        for (const row of rows) {
            const queryNorm = row.get('query_norm')?.toUpperCase().replace(/[^A-Z0-9]/g, '');
            const oemCodes = row.get('oem_codes')?.toUpperCase().replace(/[^A-Z0-9]/g, '');
            const sku = row.get('sku')?.toUpperCase().replace(/[^A-Z0-9]/g, '');

            if (queryNorm === normalizedCode || 
                oemCodes === normalizedCode || 
                sku === normalizedCode) {
                
                console.log(`📊 Found in Google Sheet Master: ${code} → ${row.get('sku')}`);
                
                return {
                    found: true,
                    query_norm: row.get('query_norm'),
                    sku: row.get('sku'),
                    description: row.get('description'),
                    family: row.get('family'),
                    duty: row.get('duty'),
                    oem_codes: row.get('oem_codes'),
                    cross_reference: tryParseJSON(row.get('cross_reference')),
                    media_type: row.get('media_type'),
                    filter_type: row.get('filter_type'),
                    subtype: row.get('subtype'),
                    engine_applications: tryParseJSON(row.get('engine_applications')),
                    equipment_applications: tryParseJSON(row.get('equipment_applications')),
                    attributes: {
                        height_mm: row.get('height_mm'),
                        outer_diameter_mm: row.get('outer_diameter_mm'),
                        thread_size: row.get('thread_size'),
                        gasket_od_mm: row.get('gasket_od_mm'),
                        gasket_id_mm: row.get('gasket_id_mm'),
                        bypass_valve_psi: row.get('bypass_valve_psi'),
                        micron_rating: row.get('micron_rating'),
                        weight_grams: row.get('weight_grams')
                    },
                    source: row.get('source'),
                    homologated_sku: row.get('homologated_sku'),
                    all_cross_references: tryParseJSON(row.get('all_cross_references'))
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

/**
 * Append single filter to Google Sheets Master
 * @param {object} data - Filter data to append
 */
async function appendToSheet(data) {
    try {
        const doc = await initSheet();
        const sheet = doc.sheetsByIndex[0];

        // Extract attributes
        const attrs = data.attributes || {};
        
        // Prepare row data according to exact column structure
        const rowData = {
            query_norm: data.query_normalized || data.code_input || '',
            sku: data.sku || '',
            description: attrs.description || attrs.type || '',
            family: data.family || '',
            duty: data.duty || '',
            oem_codes: data.code_oem || data.oem_equivalent || '',
            cross_reference: JSON.stringify(data.cross_reference || []),
            media_type: data.media || '',
            filter_type: data.filter_type || data.family || '',
            subtype: attrs.subtype || attrs.style || '',
            engine_applications: JSON.stringify(data.applications || []),
            equipment_applications: JSON.stringify(data.equipment_applications || []),
            height_mm: attrs.height_mm || attrs.height || attrs.length || '',
            outer_diameter_mm: attrs.outer_diameter_mm || attrs.outer_diameter || '',
            thread_size: attrs.thread_size || '',
            gasket_od_mm: attrs.gasket_od_mm || '',
            gasket_id_mm: attrs.gasket_id_mm || '',
            bypass_valve_psi: attrs.bypass_valve_psi || '',
            micron_rating: attrs.micron_rating || attrs.efficiency || '',
            iso_main_efficiency_percent: attrs.iso_main_efficiency_percent || '',
            iso_test_method: attrs.iso_test_method || '',
            beta_200: attrs.beta_200 || '',
            hydrostatic_burst_psi: attrs.hydrostatic_burst_psi || '',
            dirt_capacity_grams: attrs.dirt_capacity_grams || '',
            rated_flow_cfm: attrs.rated_flow_cfm || '',
            rated_flow_gpm: attrs.rated_flow_gpm || '',
            panel_width_mm: attrs.panel_width_mm || '',
            panel_depth_mm: attrs.panel_depth_mm || '',
            manufacturing_standards: attrs.manufacturing_standards || '',
            certification_standards: attrs.certification_standards || '',
            operating_pressure_min_psi: attrs.operating_pressure_min_psi || '',
            operating_pressure_max_psi: attrs.operating_pressure_max_psi || '',
            operating_temperature_min_c: attrs.operating_temperature_min_c || '',
            operating_temperature_max_c: attrs.operating_temperature_max_c || '',
            fluid_compatibility: attrs.fluid_compatibility || '',
            disposal_method: attrs.disposal_method || '',
            weight_grams: attrs.weight_grams || '',
            service_life_hours: attrs.service_life_hours || '',
            change_interval_km: attrs.change_interval_km || '',
            water_separation_efficiency_percent: attrs.water_separation_efficiency_percent || '',
            drain_type: attrs.drain_type || '',
            oem_number: data.code_oem || '',
            cross_brand: data.source || '',
            cross_part_number: data.code_oem || '',
            manufactured_by: 'ELIMFILTERS',
            last4_source: data.source || '',
            last4_digits: data.last4 || '',
            source: data.source || '',
            homologated_sku: data.code_oem || '',
            review: '',
            all_cross_references: JSON.stringify(data.cross_reference || []),
            specs: JSON.stringify(attrs),
            priority_reference: data.code_oem || '',
            priority_brand_reference: data.source || '',
            ok: 'TRUE'
        };

        await sheet.addRow(rowData);
        console.log(`💾 Saved to Google Sheet Master: ${data.sku}`);

    } catch (error) {
        console.error('❌ Error appending to Google Sheet:', error.message);
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

        console.log(`📊 Syncing ${filters.length} filters...`);

        for (const filter of filters) {
            await appendToSheet(filter);
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
// EXPORTS
// ============================================================================

module.exports = {
    searchInSheet,
    appendToSheet,
    syncToSheets
};
