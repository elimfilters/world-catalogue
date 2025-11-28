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

        if (duty === 'HD') {
            family = detectFamilyHD(scraperResult.family);
        } else {
            family = detectFamilyLD(scraperResult.family);
        }

        if (!family) {
            console.log(`❌ Family detection failed`);
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
        // PASO 4: GUARDAR EN GOOGLE SHEET MASTER
        // ---------------------------------------------------------------------
        console.log(`💾 Step 4: Saving to Google Sheet Master...`);
        
        const masterData = {
            query_normalized: query,
            code_input: query,
            code_oem: scraperResult.code,
            duty,
            family,
            sku,
            media: getMedia(family, duty),
            filter_type: family,
            source: scraperResult.source,
            cross_reference: scraperResult.cross || [],
            applications: scraperResult.applications || [],
            equipment_applications: scraperResult.applications || [],
            attributes: {
                ...scraperResult.attributes,
                description: scraperResult.family || family,
                type: scraperResult.family,
                style: scraperResult.attributes?.style || 'Standard'
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
        
        const response = {
            status: 'OK',
            found_in_master: false,
            newly_generated: true,
            query_normalized: query,
            code_input: query,
            code_oem: scraperResult.code,
            duty,
            family,
            sku,
            media: getMedia(family, duty),
            source: scraperResult.source,
            oem_homologated: {
                brand: scraperResult.source,
                code: scraperResult.code,
                type: duty === 'HD' ? 'Donaldson' : 'FRAM'
            },
            cross_reference: scraperResult.cross || [],
            applications: scraperResult.applications || [],
            attributes: scraperResult.attributes || {},
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
