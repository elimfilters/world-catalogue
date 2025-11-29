// ============================================================================
// DETECTION SERVICE FINAL - v5.2.0
// Flujo correcto: Validación → Google Sheets → Generación → Guardado → Return
// ============================================================================

const normalize = require('../utils/normalize');
const { scraperBridge } = require('../scrapers/scraperBridge');
const { detectDuty } = require('../utils/dutyDetector');
const { detectFamilyHD, detectFamilyLD } = require('../utils/familyDetector');
const { generateSKU } = require('../sku/generator');
const { getMedia, getMediaSpecs, getServiceIntervals, getTechnology, getBrandTagline } = require('../utils/mediaMapper');
const { noEquivalentFound } = require('../utils/messages');
const { searchInSheet, appendToSheet } = require('./syncSheetsService');
// TODO: Upload technicalSpecsScraper.js to GitHub first
// const { extractDonaldsonSpecs, extractFramSpecs } = require('./technicalSpecsScraper');

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
        
        const duty = detectDuty(query);

        if (!duty) {
            console.log(`❌ No duty detected for: ${query}`);
            return noEquivalentFound(query, lang);
        }

        console.log(`✅ Duty detected: ${duty}`);

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
        
        let family;
        
        // Detect family from code pattern first (for FRAM codes)
        const codeUpper = scraperResult.code.toUpperCase();
        
        // CRITICAL FIX: FRAM codes are ALWAYS LD, override duty if FRAM pattern detected
        if (codeUpper.startsWith('CA') || codeUpper.startsWith('CF') || 
            codeUpper.startsWith('CH') || codeUpper.startsWith('PH') || 
            codeUpper.startsWith('TG') || codeUpper.startsWith('XG') || 
            codeUpper.startsWith('HM') || codeUpper.startsWith('G') || 
            codeUpper.startsWith('PS')) {
            duty = 'LD';  // Force LD for all FRAM codes
            console.log(`🔄 FRAM code detected - duty overridden to LD`);
        }
        
        if (codeUpper.startsWith('CA')) {
            family = 'AIR';
        } else if (codeUpper.startsWith('CF') || codeUpper.startsWith('CH')) {
            family = 'CABIN';
        } else if (codeUpper.startsWith('PH') || codeUpper.startsWith('TG') || codeUpper.startsWith('XG') || codeUpper.startsWith('HM')) {
            family = 'OIL';
        } else if (codeUpper.startsWith('G') || codeUpper.startsWith('PS')) {
            family = 'FUEL';
        } else {
            // Fallback to duty-based detection
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
        // PASO 3.5: EXTRAER ESPECIFICACIONES TÉCNICAS VIA WEB SCRAPING
        // TODO: Enable after uploading technicalSpecsScraper.js to GitHub
        // ---------------------------------------------------------------------
        // console.log(`🌐 Step 3.5: Extracting technical specs via web scraping...`);
        
        let technicalSpecs = null;
        
        /* DISABLED - technicalSpecsScraper.js not in GitHub yet
        try {
            // CRITICAL: Use DUTY to determine scraper, NOT source
            if (duty === 'HD') {
                // HD always uses Donaldson scraper
                console.log(`📡 Calling Donaldson web scraper (HD) for: ${scraperResult.code}`);
                technicalSpecs = await extractDonaldsonSpecs(scraperResult.code);
            } else if (duty === 'LD') {
                // LD always uses FRAM scraper
                console.log(`📡 Calling FRAM web scraper (LD) for: ${scraperResult.code}`);
                technicalSpecs = await extractFramSpecs(scraperResult.code);
            }
            
            if (technicalSpecs && technicalSpecs.found) {
                console.log(`✅ Technical specs extracted successfully`);
                console.log(`   - Equipment applications: ${technicalSpecs.equipment_applications?.length || 0}`);
                console.log(`   - Engine applications: ${technicalSpecs.engine_applications?.length || 0}`);
                console.log(`   - Dimensions found: ${Object.keys(technicalSpecs.dimensions || {}).length}`);
            } else {
                console.log(`⚠️  No technical specs found, using defaults`);
            }
        } catch (scrapingError) {
            console.error(`⚠️  Web scraping failed: ${scrapingError.message}`);
            // Continue without specs - non-critical
        }
        */

        // ---------------------------------------------------------------------
        // PASO 4: GUARDAR EN GOOGLE SHEET MASTER
        // ---------------------------------------------------------------------
        console.log(`💾 Step 4: Saving to Google Sheet Master...`);
        
        // Structure with all 45 columns in correct order
        const masterData = {
            // 1-5: Identification
            query_normalized: query,
            sku: sku,
            duty: duty,
            type: family, // Renamed from 'family' to 'type'
            filter_type: technicalSpecs?.technical_details?.filter_type || scraperResult.attributes?.type || family,
            
            // 6: Description
            description: technicalSpecs?.description || scraperResult.family || `${family} Filter`,
            
            // 7-8: References (FROM WEB SCRAPING)
            oem_codes: [], // TODO: Extract from cross-reference page
            cross_reference: technicalSpecs?.cross_reference || scraperResult.cross || [],
            
            // 9: Media (ELIMFILTERS proprietary technologies)
            media_type: getMedia(family, duty, scraperResult.code),
            
            // 10-11: Applications (FROM WEB SCRAPING)
            equipment_applications: technicalSpecs?.equipment_applications || scraperResult.applications || [],
            engine_applications: technicalSpecs?.engine_applications || [],
            
            // 12-15: Dimensions (FROM WEB SCRAPING)
            height_mm: technicalSpecs?.dimensions?.height_mm || '',
            outer_diameter_mm: technicalSpecs?.dimensions?.outer_diameter_mm || '',
            thread_size: technicalSpecs?.dimensions?.thread_size || '',
            micron_rating: technicalSpecs?.performance?.micron_rating || '',
            
            // 16-20: Operating Parameters
            operating_temperature_min_c: technicalSpecs?.technical_details?.operating_temperature_min_c || '-40',
            operating_temperature_max_c: technicalSpecs?.technical_details?.operating_temperature_max_c || (duty === 'LD' ? '120' : '100'),
            fluid_compatibility: technicalSpecs?.technical_details?.fluid_compatibility || 
                                (family === 'OIL' || family === 'FUEL' ? 'Engine Oil/Diesel' : 
                                family === 'AIR' ? 'Air' : 
                                family === 'CABIN' ? 'Air (Cabin)' : 'Universal'),
            disposal_method: technicalSpecs?.technical_details?.disposal_method || 'Recycle according to local regulations',
            gasket_od_mm: technicalSpecs?.dimensions?.gasket_od_mm || '',
            
            // 21-37: Additional specs (FROM WEB SCRAPING)
            subtype: technicalSpecs?.technical_details?.style || scraperResult.attributes?.series || 'Standard',
            gasket_id_mm: technicalSpecs?.dimensions?.gasket_id_mm || '',
            bypass_valve_psi: technicalSpecs?.performance?.bypass_valve_psi || '',
            beta_200: technicalSpecs?.performance?.beta_200 || '',
            hydrostatic_burst_psi: technicalSpecs?.performance?.hydrostatic_burst_psi || '',
            dirt_capacity_grams: technicalSpecs?.performance?.dirt_capacity_grams || '',
            rated_flow_gpm: technicalSpecs?.performance?.rated_flow_gpm || '',
            rated_flow_cfm: technicalSpecs?.performance?.rated_flow_cfm || '',
            operating_pressure_min_psi: technicalSpecs?.technical_details?.operating_pressure_min_psi || '',
            operating_pressure_max_psi: technicalSpecs?.technical_details?.operating_pressure_max_psi || '',
            weight_grams: technicalSpecs?.technical_details?.weight_grams || '',
            panel_width_mm: technicalSpecs?.dimensions?.panel_width_mm || '',
            panel_depth_mm: technicalSpecs?.dimensions?.panel_depth_mm || '',
            water_separation_efficiency_percent: technicalSpecs?.performance?.water_separation_efficiency_percent || '',
            drain_type: technicalSpecs?.technical_details?.drain_type || '',
            inner_diameter_mm: technicalSpecs?.dimensions?.inner_diameter_mm || '',
            pleat_count: technicalSpecs?.technical_details?.pleat_count || '',
            seal_material: technicalSpecs?.technical_details?.seal_material || '',
            housing_material: technicalSpecs?.technical_details?.housing_material || '',
            
            // 38-45: Performance and Standards (FROM WEB SCRAPING)
            iso_main_efficiency_percent: technicalSpecs?.performance?.iso_main_efficiency_percent || '',
            iso_test_method: technicalSpecs?.performance?.iso_test_method || (duty === 'HD' ? 'ISO 5011' : 'SAE J806'),
            manufacturing_standards: technicalSpecs?.technical_details?.manufacturing_standards || (duty === 'HD' ? 'ISO 9001, ISO/TS 16949' : 'ISO 9001'),
            certification_standards: Array.isArray(technicalSpecs?.standards) ? technicalSpecs.standards.join(', ') : (duty === 'HD' ? 'ISO 5011, ISO 4548-12' : 'SAE J806, SAE J1858'),
            service_life_hours: technicalSpecs?.technical_details?.service_life_hours || (scraperResult.attributes?.series === 'XG' ? '1000' : '500'),
            change_interval_km: technicalSpecs?.technical_details?.change_interval_km || (scraperResult.attributes?.series === 'XG' ? '30000' : '15000')
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
        
        const response = {
            status: 'OK',
            found_in_master: false,
            newly_generated: true,
            
            // Basic identification
            query_normalized: query,
            sku: sku,
            duty: duty,
            type: family,
            filter_type: scraperResult.attributes?.type || family,
            description: scraperResult.family || `${family} Filter`,
            
            // Media
            media_type: getMedia(family, duty),
            
            // References
            oem_codes: masterData.oem_codes || [],
            cross_reference: masterData.cross_reference || [],
            
            // Applications
            equipment_applications: masterData.equipment_applications || [],
            engine_applications: masterData.engine_applications || [],
            
            // Dimensions
            specifications: {
                height_mm: masterData.height_mm,
                outer_diameter_mm: masterData.outer_diameter_mm,
                thread_size: masterData.thread_size,
                micron_rating: masterData.micron_rating,
                gasket_od_mm: masterData.gasket_od_mm,
                gasket_id_mm: masterData.gasket_id_mm,
                bypass_valve_psi: masterData.bypass_valve_psi,
                beta_200: masterData.beta_200,
                hydrostatic_burst_psi: masterData.hydrostatic_burst_psi,
                dirt_capacity_grams: masterData.dirt_capacity_grams,
                rated_flow_gpm: masterData.rated_flow_gpm,
                rated_flow_cfm: masterData.rated_flow_cfm,
                weight_grams: masterData.weight_grams,
                panel_width_mm: masterData.panel_width_mm,
                panel_depth_mm: masterData.panel_depth_mm,
                inner_diameter_mm: masterData.inner_diameter_mm,
                pleat_count: masterData.pleat_count,
                seal_material: masterData.seal_material,
                housing_material: masterData.housing_material
            },
            
            // Operating parameters
            operating_parameters: {
                temperature_min_c: masterData.operating_temperature_min_c,
                temperature_max_c: masterData.operating_temperature_max_c,
                pressure_min_psi: masterData.operating_pressure_min_psi,
                pressure_max_psi: masterData.operating_pressure_max_psi,
                fluid_compatibility: masterData.fluid_compatibility,
                disposal_method: masterData.disposal_method
            },
            
            // Performance
            performance: {
                iso_main_efficiency_percent: masterData.iso_main_efficiency_percent,
                iso_test_method: masterData.iso_test_method,
                service_life_hours: masterData.service_life_hours,
                change_interval_km: masterData.change_interval_km
            },
            
            // Standards
            standards: {
                manufacturing: masterData.manufacturing_standards,
                certification: masterData.certification_standards
            },
            
            // Fuel-specific
            fuel_separator: family === 'FUEL' ? {
                water_separation_efficiency_percent: masterData.water_separation_efficiency_percent,
                drain_type: masterData.drain_type
            } : undefined,
            
            // Additional info
            subtype: masterData.subtype,
            source: scraperResult.source,
            
            // Brand
            brand: getBrandTagline(),
            
            message: 'Filtro GENUINO ELIMFILTERS - Precisión Alemana CERTIFICADA'
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
