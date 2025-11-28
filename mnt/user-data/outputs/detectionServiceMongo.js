// ============================================================================
// DETECTION SERVICE WITH MONGODB CACHE - v5.2.0
// Main filter detection orchestrator with MongoDB caching
// ============================================================================

const normalize = require('../utils/normalize');
const { scraperBridge } = require('../scrapers/scraperBridge');
const { detectDuty } = require('../utils/dutyDetector');
const { detectFamilyHD, detectFamilyLD } = require('../utils/familyDetector');
const { generateSKU } = require('../sku/generator');
const { getMedia } = require('../utils/mediaMapper');
const { noEquivalentFound } = require('../utils/messages');
const { searchCache, saveToCache } = require('./mongoService');

// ============================================================================
// MAIN DETECTION SERVICE
// ============================================================================

async function detectFilter(rawInput, lang = 'en') {
    try {
        const query = normalize.code(rawInput);

        console.log(`📊 Processing: ${query}`);

        // ---------------------------------------------------------------------
        // 0) CHECK MONGODB CACHE FIRST
        // ---------------------------------------------------------------------
        try {
            const cachedResult = await searchCache(query);
            
            if (cachedResult && cachedResult.found) {
                console.log(`⚡ MongoDB Cache HIT: ${query} → ${cachedResult.sku}`);
                
                return {
                    status: 'OK',
                    cached: true,
                    query_normalized: query,
                    duty: cachedResult.duty,
                    family: cachedResult.family,
                    sku: cachedResult.sku,
                    media: cachedResult.media,
                    source: cachedResult.source,
                    oem_equivalent: cachedResult.code_oem,
                    last4: cachedResult.sku.slice(-4),
                    cross_reference: cachedResult.cross_reference || [],
                    applications: cachedResult.applications || [],
                    attributes: cachedResult.attributes || {},
                    message: 'Result retrieved from MongoDB cache'
                };
            }
            
            console.log(`🔍 Cache MISS - proceeding with scrapers`);
        } catch (cacheError) {
            console.log(`⚠️  Cache lookup failed, continuing with scrapers: ${cacheError.message}`);
        }

        // ---------------------------------------------------------------------
        // 1) Determine DUTY (HD or LD)
        // ---------------------------------------------------------------------
        const duty = detectDuty(query);

        if (!duty) {
            console.log(`⚠️  No duty detected for: ${query}`);
            return noEquivalentFound(query, lang);
        }

        console.log(`✅ Duty detected: ${duty}`);

        // ---------------------------------------------------------------------
        // 2) Execute SCRAPER BRIDGE
        // ---------------------------------------------------------------------
        const scraperResult = await scraperBridge(query, duty);

        if (!scraperResult || !scraperResult.last4) {
            console.log(`⚠️  No scraper result for: ${query}`);
            return noEquivalentFound(query, lang);
        }

        console.log(`✅ Scraper: ${scraperResult.source}`);

        // ---------------------------------------------------------------------
        // 3) Determine ELIMFILTERS Family
        // ---------------------------------------------------------------------
        let family;

        if (duty === 'HD') {
            family = detectFamilyHD(scraperResult.family);
        } else {
            family = detectFamilyLD(scraperResult.family);
        }

        if (!family) {
            console.log(`⚠️  No family detected`);
            return noEquivalentFound(query, lang);
        }

        console.log(`✅ Family: ${family}`);

        // ---------------------------------------------------------------------
        // 4) Generate ELIMFILTERS SKU
        // ---------------------------------------------------------------------
        const sku = generateSKU(family, duty, scraperResult.last4);

        if (!sku || sku.error) {
            console.log(`⚠️  SKU generation failed: ${sku?.error}`);
            return noEquivalentFound(query, lang);
        }

        console.log(`✅ SKU Generated: ${sku}`);

        // ---------------------------------------------------------------------
        // 5) Build Final Response
        // ---------------------------------------------------------------------
        const response = {
            status: 'OK',
            cached: false,
            query_normalized: query,
            duty,
            family,
            sku,
            media: getMedia(family, duty),
            source: scraperResult.source,
            oem_equivalent: scraperResult.code,
            last4: scraperResult.last4,
            cross_reference: scraperResult.cross || [],
            applications: scraperResult.applications || [],
            attributes: scraperResult.attributes || {},
            message: 'Valid ELIMFILTERS SKU generated successfully'
        };

        console.log(`✅ Detection complete: ${sku}`);

        // ---------------------------------------------------------------------
        // 6) SAVE TO MONGODB CACHE (async, non-blocking)
        // ---------------------------------------------------------------------
        saveToCache(response).catch(err => {
            console.log(`⚠️  Cache save failed (non-critical): ${err.message}`);
        });

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
