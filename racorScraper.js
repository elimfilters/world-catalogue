// ============================================================================
// RACOR SCRAPER - Complete Version with Database
// Supports: R, S3, 2-Micron, Spin-On series
// ============================================================================

const axios = require('axios');
const { extract4Digits } = require('../utils/digitExtractor');
const prefixMap = require('../config/prefixMap');

/**
 * Comprehensive RACOR database
 */
const RACOR_DATABASE = {
    // ========== R-SERIES (Standard Spin-On) ==========
    'R45P10': {
        family: 'FUEL',
        type: 'FUEL FILTER, SPIN-ON',
        specifications: {
            efficiency: '10 micron',
            media_type: 'Cellulose',
            type: 'Spin-On Fuel Filter',
            bypass: 'Full flow'
        },
        cross_references: {},
        applications: ['Marine Diesel', 'Industrial Fuel Systems']
    },
    'R45S10': {
        family: 'FUEL',
        type: 'FUEL FILTER/WATER SEPARATOR, SPIN-ON',
        specifications: {
            efficiency: '10 micron',
            type: 'Spin-On Fuel/Water Separator',
            function: 'Fuel Filtration + Water Removal'
        },
        cross_references: {},
        applications: ['Marine Diesel', 'Heavy Duty Fuel']
    },
    'R45P25': {
        family: 'FUEL',
        type: 'FUEL FILTER, SPIN-ON',
        specifications: {
            efficiency: '25 micron',
            media_type: 'Cellulose'
        },
        cross_references: {},
        applications: ['Industrial Fuel Systems']
    },
    
    // ========== S3-SERIES (2-Micron Fine Filtration) ==========
    'S3130': {
        family: 'FUEL',
        type: 'FUEL FILTER, 2-MICRON SPIN-ON',
        specifications: {
            efficiency: '2 micron',
            media_type: 'Fine Cellulose',
            type: 'Spin-On Ultra-Fine',
            function: 'Premium Fuel Filtration'
        },
        cross_references: {},
        applications: ['Premium Marine Diesel', 'Industrial High-Performance']
    },
    'S3165': {
        family: 'FUEL',
        type: 'FUEL FILTER, 2-MICRON SPIN-ON',
        specifications: {
            efficiency: '2 micron',
            media_type: 'Fine Cellulose',
            bypass: 'Full flow'
        },
        cross_references: {},
        applications: ['High-Efficiency Fuel Systems']
    },
    
    // ========== MARINE-SPECIFIC (MOR, MOL, WD SERIES) ==========
    'MOR1005': {
        family: 'FUEL',
        type: 'FUEL FILTER, MARINE OFFSHORE RATING',
        specifications: {
            efficiency: '10 micron',
            type: 'Marine Offshore Rated',
            bypass: 'Full flow'
        },
        cross_references: {},
        applications: ['Offshore Marine Diesel']
    },
    'MOL1005': {
        family: 'OIL',
        type: 'OIL FILTER, MARINE',
        specifications: {
            efficiency: '10 micron',
            media_type: 'Marine Grade'
        },
        cross_references: {},
        applications: ['Marine Engine Oil Filtration']
    },
    'WD100': {
        family: 'FUEL',
        type: 'WATER DRAIN CARTRIDGE',
        specifications: {
            type: 'Manual Water Drain',
            function: 'Water Removal from Tanks'
        },
        cross_references: {},
        applications: ['Marine/Industrial Tank Maintenance']
    },
    
    // ========== REMAN/REBUILT SERIES ==========
    'REMAN1005': {
        family: 'FUEL',
        type: 'FUEL FILTER, REMANUFACTURED',
        specifications: {
            efficiency: '10 micron',
            type: 'Remanufactured Spin-On',
            certification: 'Remanufactured Grade'
        },
        cross_references: {},
        applications: ['Cost-Effective Marine Fuel Filtration']
    }
};

/**
 * Detect RACOR series type from code
 */
function detectRacorSeriesType(code) {
    const normalized = code.toUpperCase();
    
    if (normalized.startsWith('S3')) return 'S3';
    if (normalized.startsWith('MOR')) return 'MOR';
    if (normalized.startsWith('MOL')) return 'MOL';
    if (normalized.startsWith('WD')) return 'WD';
    if (normalized.startsWith('REMAN')) return 'REMAN';
    if (normalized.startsWith('R')) return 'R';
    
    return null;
}

/**
 * Detect family from RACOR code
 */
function detectRacorFamilyFromCode(code) {
    const normalized = code.toUpperCase();
    const series = detectRacorSeriesType(normalized);
    
    if (series === 'S3' || series === 'R' || series === 'MOR' || series === 'REMAN') return 'FUEL';
    if (series === 'MOL') return 'OIL';
    if (series === 'WD') return 'FUEL';
    
    return null;
}

/**
 * Find RACOR code from cross-reference
 */
function findRacorCode(inputCode) {
    const normalized = String(inputCode || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
    
    // Direct lookup
    if (RACOR_DATABASE[normalized]) {
        return normalized;
    }
    
    // Search in cross-references
    for (const [racorCode, filterData] of Object.entries(RACOR_DATABASE)) {
        const xrefs = filterData?.cross_references || {};
        for (const [xrefCode] of Object.entries(xrefs)) {
            const xrefNormalized = String(xrefCode || '')
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '');
            
            if (xrefNormalized === normalized || xrefNormalized.includes(normalized)) {
                return racorCode;
            }
        }
    }
    
    return null;
}

/**
 * Main scraper function
 */
async function scrapeRacor(code) {
    try {
        console.log(`📡 RACOR scraper: ${code}`);
        
        const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
        
        // Try cross-reference lookup
        let racorCode = findRacorCode(normalized);
        
        if (racorCode && RACOR_DATABASE[racorCode]) {
            const filter = RACOR_DATABASE[racorCode];
            const series = detectRacorSeriesType(racorCode);
            
            console.log(`✅ Found via cross-reference: ${code} → ${racorCode} (${series}-series)`);
            
            const crossTokens = Object.keys(filter.cross_references || {});
            return {
                found: true,
                code: racorCode,
                original_code: code,
                series: series,
                family_hint: filter.family,
                cross: crossTokens,
                applications: filter.applications || [],
                attributes: filter.specifications || {}
            };
        }
        
        // Try direct lookup
        if (RACOR_DATABASE[normalized]) {
            const filter = RACOR_DATABASE[normalized];
            const series = detectRacorSeriesType(normalized);
            
            console.log(`✅ Found directly: ${normalized} (${series}-series)`);
            
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
        const series = detectRacorSeriesType(normalized);
        const detectedFamily = detectRacorFamilyFromCode(normalized);
        if (series && detectedFamily && /^[A-Z0-9]{4,}/.test(normalized)) {
            console.log(`✅ Pattern accepted: ${normalized} → ${series}-series, ${detectedFamily}`);
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
        console.log(`⚠️  RACOR filter not found: ${code}`);
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
        console.error(`❌ RACOR scraper error: ${error.message}`);
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
async function validateRacorCode(inputCode) {
    const normalized = String(inputCode || '').toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
    try {
        const result = await scrapeRacor(normalized);
        if (result && result.found) {
            const family = result.family_hint || detectRacorFamilyFromCode(result.code) || null;
            const last4 = extract4Digits(result.code);
            return {
                valid: true,
                code: result.code,
                source: 'RACOR',
                family,
                duty: 'HD',
                last4,
                cross: result.cross || [],
                applications: result.applications || [],
                attributes: {
                    ...(result.attributes || {}),
                    series: result.series || detectRacorSeriesType(result.code) || null
                }
            };
        }
        return { valid: false, code: normalized, reason: 'NOT_FOUND_RACOR' };
    } catch (e) {
        return { valid: false, code: normalized, reason: 'RACOR_ERROR', message: e?.message };
    }
}

module.exports = {
    scrapeRacor,
    RACOR_DATABASE,
    findRacorCode,
    detectRacorSeriesType,
    detectRacorFamilyFromCode,
    validateRacorCode
};
