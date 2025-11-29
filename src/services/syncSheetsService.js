// ============================================================================
// GOOGLE SHEETS SYNC SERVICE
// Export MongoDB cache to Google Sheet Master for visualization/reporting
// ============================================================================

const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const { getAllFilters } = require('./mongoService');

// ============================================================================
// CONFIGURATION
// ============================================================================

const SHEET_ID = '1ZYI5c0enkuvWAveu8HMaCUk1cek_VDrX8GtgKW7VP6U';

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
        
        console.log(`📊 Google Sheet loaded: ${doc.title}`);
        return doc;

    } catch (error) {
        console.error('❌ Error initializing Google Sheet:', error.message);
        throw error;
    }
}

// ============================================================================
// SYNC OPERATIONS
// ============================================================================

/**
 * Sync MongoDB cache to Google Sheets
 * @param {number} limit - Max records to sync
 */
async function syncToSheets(limit = 1000) {
    try {
        console.log('🔄 Starting sync to Google Sheets...');

        // Get all filters from MongoDB
        const filters = await getAllFilters({}, limit);
        
        if (filters.length === 0) {
            console.log('⚠️  No filters to sync');
            return { success: false, message: 'No filters in MongoDB' };
        }

        console.log(`📊 Syncing ${filters.length} filters...`);

        // Initialize Sheet
        const doc = await initSheet();
        const sheet = doc.sheetsByIndex[0];

        // Clear existing data (keep headers)
        await sheet.clearRows();

        // Initialize headers if needed
        await sheet.setHeaderRow([
            'CODE_CLIENT',
            'CODE_OEM',
            'DUTY',
            'FAMILY',
            'SKU',
            'MEDIA',
            'SOURCE',
            'CROSS_REF',
            'APPLICATIONS',
            'ATTRIBUTES',
            'TIMESTAMP'
        ]);

        // Prepare rows
        const rows = filters.map(filter => ({
            CODE_CLIENT: filter.code_client || '',
            CODE_OEM: filter.code_oem || '',
            DUTY: filter.duty || '',
            FAMILY: filter.family || '',
            SKU: filter.sku || '',
            MEDIA: filter.media || '',
            SOURCE: filter.source || '',
            CROSS_REF: JSON.stringify(filter.cross_reference || []),
            APPLICATIONS: JSON.stringify(filter.applications || []),
            ATTRIBUTES: JSON.stringify(filter.attributes || {}),
            TIMESTAMP: filter.timestamp ? new Date(filter.timestamp).toISOString() : ''
        }));

        // Add rows in batches (Google Sheets API limit)
        const batchSize = 100;
        for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, i + batchSize);
            await sheet.addRows(batch);
            console.log(`✅ Synced batch ${i / batchSize + 1} (${batch.length} rows)`);
        }

        console.log(`✅ Sync complete: ${filters.length} filters synced to Google Sheets`);
        
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
            const sku = row.get('sku')?.toUpperCase().replace(/[^A-Z0-9]/g, '');

            if (queryNorm === normalizedCode || sku === normalizedCode) {
                
                console.log(`✅ Found in Google Sheet: ${code} → ${row.get('sku')}`);
                
                return {
                    found: true,
                    sku: row.get('sku'),
                    duty: row.get('duty'),
                    type: row.get('type'),
                    media_type: row.get('media_type'),
                    description: row.get('description'),
                    filter_type: row.get('filter_type'),
                    oem_codes: row.get('oem_codes')?.split(', ') || [],
                    cross_reference: row.get('cross_reference')?.split(', ') || [],
                    equipment_applications: row.get('equipment_applications')?.split(', ') || [],
                    engine_applications: row.get('engine_applications')?.split(', ') || [],
                    subtype: row.get('subtype'),
                    // Dimensions
                    height_mm: row.get('height_mm'),
                    outer_diameter_mm: row.get('outer_diameter_mm'),
                    thread_size: row.get('thread_size'),
                    // Standards
                    manufacturing_standards: row.get('manufacturing_standards'),
                    certification_standards: row.get('certification_standards'),
                    iso_test_method: row.get('iso_test_method')
                };
            }
        }

        return null;

    } catch (error) {
        console.error('❌ Error searching Google Sheet:', error.message);
        return null;
    }
}

/**
 * Safely parse JSON string
 */
function tryParseJSON(str) {
    try {
        return JSON.parse(str);
    } catch {
        return str || [];
    }
}

/**
 * Append single filter to Google Sheets (real-time)
 * @param {object} filter - Filter data to append (with 45 columns)
 */
async function appendToSheet(filter) {
    try {
        const doc = await initSheet();
        const sheet = doc.sheetsByIndex[0];

        // All 45 columns in correct order
        const rowData = {
            // 1-5: Identification
            query_norm: filter.query_normalized || filter.query_norm || '',
            sku: filter.sku || '',
            duty: filter.duty || '',
            type: filter.type || filter.family || '',
            filter_type: filter.filter_type || '',
            
            // 6: Description
            description: filter.description || '',
            
            // 7-8: References
            oem_codes: Array.isArray(filter.oem_codes) ? filter.oem_codes.join(', ') : '',
            cross_reference: Array.isArray(filter.cross_reference) ? filter.cross_reference.join(', ') : '',
            
            // 9: Media
            media_type: filter.media_type || '',
            
            // 10-11: Applications
            equipment_applications: Array.isArray(filter.equipment_applications) ? filter.equipment_applications.join(', ') : '',
            engine_applications: Array.isArray(filter.engine_applications) ? filter.engine_applications.join(', ') : '',
            
            // 12-15: Dimensions
            height_mm: filter.height_mm || '',
            outer_diameter_mm: filter.outer_diameter_mm || '',
            thread_size: filter.thread_size || '',
            micron_rating: filter.micron_rating || '',
            
            // 16-20: Operating Parameters
            operating_temperature_min_c: filter.operating_temperature_min_c || '',
            operating_temperature_max_c: filter.operating_temperature_max_c || '',
            fluid_compatibility: filter.fluid_compatibility || '',
            disposal_method: filter.disposal_method || '',
            gasket_od_mm: filter.gasket_od_mm || '',
            
            // 21-37: Additional specs
            subtype: filter.subtype || '',
            gasket_id_mm: filter.gasket_id_mm || '',
            bypass_valve_psi: filter.bypass_valve_psi || '',
            beta_200: filter.beta_200 || '',
            hydrostatic_burst_psi: filter.hydrostatic_burst_psi || '',
            dirt_capacity_grams: filter.dirt_capacity_grams || '',
            rated_flow_gpm: filter.rated_flow_gpm || '',
            rated_flow_cfm: filter.rated_flow_cfm || '',
            operating_pressure_min_psi: filter.operating_pressure_min_psi || '',
            operating_pressure_max_psi: filter.operating_pressure_max_psi || '',
            weight_grams: filter.weight_grams || '',
            panel_width_mm: filter.panel_width_mm || '',
            panel_depth_mm: filter.panel_depth_mm || '',
            water_separation_efficiency_percent: filter.water_separation_efficiency_percent || '',
            drain_type: filter.drain_type || '',
            inner_diameter_mm: filter.inner_diameter_mm || '',
            pleat_count: filter.pleat_count || '',
            seal_material: filter.seal_material || '',
            housing_material: filter.housing_material || '',
            
            // 38-45: Performance and Standards
            iso_main_efficiency_percent: filter.iso_main_efficiency_percent || '',
            iso_test_method: filter.iso_test_method || '',
            manufacturing_standards: filter.manufacturing_standards || '',
            certification_standards: filter.certification_standards || '',
            service_life_hours: filter.service_life_hours || '',
            change_interval_km: filter.change_interval_km || ''
        };

        await sheet.addRow(rowData);
        console.log(`✅ Appended to Sheet: ${filter.sku} (45 columns)`);

    } catch (error) {
        console.error('❌ Error appending to Google Sheet:', error.message);
        throw error;
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    syncToSheets,
    appendToSheet,
    searchInSheet
};
