// ============================================================================
// MERCRUISER SCRAPER - Complete Version with Database
// Supports: XXX-XXXXXX format marine engines
// ============================================================================

const axios = require('axios');
const { extract4Digits } = require('../utils/digitExtractor');
const prefixMap = require('../config/prefixMap');

/**
 * Comprehensive Mercruiser database
 */
const MERCRUISER_DATABASE = {
    // ========== OIL FILTERS (Marine) ==========
    '35881754': {
        family: 'OIL',
        type: 'OIL FILTER, MARINE SPIN-ON',
        specifications: {
            efficiency: '99% @ 21 micron',
            media_type: 'Cellulose',
            type: 'Spin-On Marine',
            application: 'Mercruiser In-Line Engines'
        },
        cross_references: {},
        applications: ['Mercruiser In-Line Diesel', 'Marine Engines']
    },
    '865440A2': {
        family: 'OIL',
        type: 'OIL FILTER, MARINE SPIN-ON',
        specifications: {
            efficiency: '99% @ 10 micron',
            media_type: 'Premium Marine Cellulose'
        },
        cross_references: {},
        applications: ['Mercruiser V8 Gasoline']
    },
    
    // ========== FUEL FILTERS (Marine) ==========
    '35-864808T': {
        family: 'FUEL',
        type: 'FUEL FILTER, MARINE SPIN-ON',
        specifications: {
            efficiency: '10 micron',
            type: 'Spin-On Fuel Filter',
            media_type: 'Marine Fuel Media'
        },
        cross_references: {},
        applications: ['Marine Fuel Systems', 'Mercruiser Inboards']
    },
    '864808T01': {
        family: 'FUEL',
        type: 'FUEL FILTER, MARINE WATER SEPARATOR',
        specifications: {
            efficiency: '10 micron',
            type: 'Spin-On Fuel/Water Separator',
            function: 'Fuel Filtration + Water Removal'
        },
        cross_references: {},
        applications: ['Marine Fuel Systems with Water Separator']
    },
    
    // ========== TRANSMISSION FILTERS (Marine) ==========
    '35-864001T': {
        family: 'TRANSMISSION',
        type: 'TRANSMISSION FILTER, MARINE',
        specifications: {
            efficiency: '25 micron',
            type: 'Transmission Filter',
            application: 'Marine Gearbox'
        },
        cross_references: {},
        applications: ['Mercruiser Marine Transmissions']
    },
    
    // ========== COOLANT FILTERS (Marine) ==========
    '35-804201': {
        family: 'COOLANT',
        type: 'COOLANT FILTER, MARINE SPIN-ON',
        specifications: {
            efficiency: '40 micron',
            type: 'Spin-On Coolant Filter'
        },
        cross_references: {},
        applications: ['Marine Cooling Systems']
    },
    
    // ========== AIR FILTERS (Marine) ==========
    '35-818662T': {
        family: 'AIRE',
        type: 'AIR FILTER, MARINE ENGINE',
        specifications: {
            efficiency: '99.5% @ 25 micron',
            media_type: 'Marine Grade Cellulose',
            type: 'Panel Air Filter'
        },
        cross_references: {},
        applications: ['Marine Engine Air Intake']
    }
};

/**
 * Detect Mercruiser series type from code
 */
function detectMercruiserSeriesType(code) {
    const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Mercruiser typically: XXX-XXXXXX or direct numbers
    if (normalized.length >= 6) {
        // Check for known prefixes
        if (normalized.includes('35')) return 'MERCRUISER_35';
        if (normalized.includes('865')) return 'MERCRUISER_865';
        if (normalized.includes('804')) return 'MERCRUISER_804';
        if (normalized.includes('818')) return 'MERCRUISER_818';
        if (normalized.includes('864')) return 'MERCRUISER_864';
    }
    
    return 'MERCRUISER';
}

/**
 * Detect family from Mercruiser code
 */
function detectMercruiserFamilyFromCode(code) {
    const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const series = detectMercruiserSeriesType(code);
    
    // Pattern-based detection
    if (normalized.includes('881754')) return 'OIL';
    if (normalized.includes('865440')) return 'OIL';
    if (normalized.includes('864808')) return 'FUEL';
    if (normalized.includes('864001')) return 'TRANSMISSION';
    if (normalized.includes('804201')) return 'COOLANT';
    if (normalized.includes('818662')) return 'AIRE';
    
    return null;
}

/**
 * Find Mercruiser code from cross-reference
 */
function findMercruiserCode(inputCode) {
    const normalized = String(inputCode || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
    
    // Direct lookup
    if (MERCRUISER_DATABASE[normalized]) {
        return normalized;
    }
    
    // Search in cross-references
    for (const [mercruiserCode, filterData] of Object.entries(MERCRUISER_DATABASE)) {
        const xrefs = filterData?.cross_references || {};
        for (const [xrefCode] of Object.entries(xrefs)) {
            const xrefNormalized = String(xrefCode || '')
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '');
            
            if (xrefNormalized === normalized || xrefNormalized.includes(normalized)) {
                return mercruiserCode;
            }
        }
    }
    
    return null;
}

/**
 * Main scraper function
 */
async function scrapeMercruiser(code) {
    try {
        console.log(`📡 Mercruiser scraper: ${code}`);
        
        const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
        
        // Try cross-reference lookup
        let mercruiserCode = findMercruiserCode(normalized);
        
        if (mercruiserCode && MERCRUISER_DATABASE[mercruiserCode]) {
            const filter = MERCRUISER_DATABASE[mercruiserCode];
            const series = detectMercruiserSeriesType(mercruiserCode);
            
            console.log(`✅ Found via cross-reference: ${code} → ${mercruiserCode} (${series})`);
            
            const crossTokens = Object.keys(filter.cross_references || {});
            return {
                found: true,
                code: mercruiserCode,
                original_code: code,
                series: series,
                family_hint: filter.family,
                cross: crossTokens,
                applications: filter.applications || [],
                attributes: filter.specifications || {}
            };
        }
        
        // Try direct lookup
        if (MERCRUISER_DATABASE[normalized]) {
            const filter = MERCRUISER_DATABASE[normalized];
            const series = detectMercruiserSeriesType(normalized);
            
            console.log(`✅ Found directly: ${normalized} (${series})`);
            
            const crossTokens = Object.keys(filter.cross_references || {});
            return {
                found: true,
                code: normalized,
                original_code: code,
                series: series,
                family_hint: filter.family,
                cross: crossTokens,
                applications: filter.applications || [],
                attributes: filter.specifications || {}
            };
        }
        
        // Pattern detection
        const series = detectMercruiserSeriesType(normalized);
        const detectedFamily = detectMercruiserFamilyFromCode(normalized);
        if (series && detectedFamily && /^\d{6,}/.test(normalized)) {
            console.log(`✅ Pattern accepted: ${normalized} → ${series}, ${detectedFamily}`);
            return {
                found: true,
                code: normalized,
                original_code: code,
                series,
                family_hint: detectedFamily,
                cross: [],
                applications: [],
                attributes: { product_type: detectedFamily }
            };
        }
        
        // Not found
        console.log(`⚠️  Mercruiser filter not found: ${code}`);
        return {
            found: false,
            code: code,
            original_code: code,
            series: null,
            family_hint: null,
            cross: [],
            applications: [],
            attributes: {}
        };

    } catch (error) {
        console.error(`❌ Mercruiser scraper error: ${error.message}`);
        return {
            found: false,
            code: code,
            original_code: code,
            series: null,
            family_hint: null,
            cross: [],
            applications: [],
            attributes: {}
        };
    }
}

/**
 * Validator compatible with bridge
 */
async function validateMercruiserCode(inputCode) {
    const normalized = String(inputCode || '').toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
    try {
        const result = await scrapeMercruiser(normalized);
        if (result && result.found) {
            const family = result.family_hint || detectMercruiserFamilyFromCode(result.code) || null;
            const last4 = extract4Digits(result.code);
            return {
                valid: true,
                code: result.code,
                source: 'MERCRUISER',
                family,
                duty: 'MARINE',
                last4,
                cross: result.cross || [],
                applications: result.applications || [],
                attributes: {
                    ...(result.attributes || {}),
                    series: result.series || detectMercruiserSeriesType(result.code) || null
                }
            };
        }
        return { valid: false, code: normalized, reason: 'NOT_FOUND_MERCRUISER' };
    } catch (e) {
        return { valid: false, code: normalized, reason: 'MERCRUISER_ERROR', message: e?.message };
    }
}

module.exports = {
    scrapeMercruiser,
    MERCRUISER_DATABASE,
    findMercruiserCode,
    detectMercruiserSeriesType,
    detectMercruiserFamilyFromCode,
    validateMercruiserCode
};
