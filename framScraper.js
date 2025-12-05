// ============================================================================
// FRAM SCRAPER - Complete Version with Database
// Supports: PH, TG, XG, HM, CH, CA, CF, G, PS series
// ============================================================================

const axios = require('axios');
const { extract4Digits } = require('../utils/digitExtractor');
const prefixMap = require('../config/prefixMap');

/**
 * Comprehensive FRAM database
 */
const FRAM_DATABASE = {
    // ========== PH-SERIES (Oil Filters - Primary/Secondary) ==========
    'PH7405': {
        family: 'OIL',
        type: 'OIL FILTER, SPIN-ON',
        specifications: {
            thread_size: 'M20 x 1.5',
            outer_diameter: '76 mm',
            height: '102 mm',
            efficiency: '99% @ 21 micron',
            media_type: 'Cellulose'
        },
        cross_references: {
            'DONALDSON-P552100': 'PH7405',
            'FLEETGUARD-LF3620': 'PH7405',
            'BALDWIN-B495': 'PH7405',
            'CATERPILLAR-3I1882': 'PH7405'
        },
        applications: ['Detroit Diesel', 'Freightliner', 'Caterpillar']
    },
    'PH8A': {
        family: 'OIL',
        type: 'OIL FILTER, SPIN-ON',
        specifications: {
            thread_size: 'M18 x 1.5',
            outer_diameter: '89 mm',
            height: '127 mm',
            efficiency: '99% @ 21 micron'
        },
        cross_references: {},
        applications: ['Heavy Duty Engines']
    },
    'PH9688': {
        family: 'OIL',
        type: 'OIL FILTER, SPIN-ON EXTENDED',
        specifications: {
            efficiency: '99% @ 21 micron',
            media_type: 'Cellulose Extended',
            bypass: 'Full flow'
        },
        cross_references: {},
        applications: ['Cummins ISX', 'Peterbilt', 'Kenworth']
    },
    
    // ========== TG-SERIES (Transmission Filters) ==========
    'TG5000': {
        family: 'TRANSMISSION',
        type: 'TRANSMISSION FILTER, SPIN-ON',
        specifications: {
            type: 'Spin-On Transmission',
            efficiency: '25 micron'
        },
        cross_references: {},
        applications: ['Allison Transmissions', 'Heavy Duty']
    },
    
    // ========== XG-SERIES (Extreme Guard - Synthetic Media) ==========
    'XG10285': {
        family: 'OIL',
        type: 'OIL FILTER, SYNTHETIC MEDIA SPIN-ON',
        specifications: {
            efficiency: '99.9% @ 21 micron',
            media_type: 'Synthetic',
            service_life: '2x standard cellulose'
        },
        cross_references: {},
        applications: ['Premium Synthetic Applications']
    },
    
    // ========== HM-SERIES (Heavy-Duty Media) ==========
    'HM2108': {
        family: 'OIL',
        type: 'OIL FILTER, HEAVY MEDIA SPIN-ON',
        specifications: {
            efficiency: '99.5% @ 10 micron',
            media_type: 'Heavy Duty',
            bypass: 'Full flow'
        },
        cross_references: {},
        applications: ['Heavy Duty Diesel', 'Industrial']
    },
    
    // ========== CH-SERIES (Cabin/Coolant) ==========
    'CH10303': {
        family: 'COOLANT',
        type: 'COOLANT FILTER',
        specifications: {
            type: 'Spin-On Coolant',
            efficiency: '40 micron'
        },
        cross_references: {},
        applications: ['Heavy Duty Cooling Systems']
    },
    
    // ========== CA-SERIES (Air Filters) ==========
    'CA10896': {
        family: 'AIRE',
        type: 'AIR FILTER, PANEL',
        specifications: {
            efficiency: '99.5% @ 25 micron',
            media_type: 'Fiberglass',
            type: 'Panel'
        },
        cross_references: {},
        applications: ['Heavy Duty Engines']
    },
    'CA11003': {
        family: 'AIRE',
        type: 'AIR FILTER, PANEL PRIMARY',
        specifications: {
            efficiency: '99.9% @ 10 micron',
            media_type: 'Fiberglass Primary'
        },
        cross_references: {},
        applications: ['Cummins', 'Detroit Diesel']
    },
    
    // ========== CF-SERIES (Cabin Air Filters) ==========
    'CF11683': {
        family: 'CABIN AIR',
        type: 'CABIN AIR FILTER',
        specifications: {
            type: 'Panel Cabin Air'
        },
        cross_references: {},
        applications: ['Vehicle Cabin Filtration']
    },
    
    // ========== G-SERIES (General Purpose) ==========
    'G10000': {
        family: 'OIL',
        type: 'OIL FILTER, GENERAL PURPOSE',
        specifications: {
            efficiency: '99% @ 25 micron'
        },
        cross_references: {},
        applications: ['General Industrial']
    },
    
    // ========== PS-SERIES (Power Steering) ==========
    'PS10000': {
        family: 'POWER STEERING',
        type: 'POWER STEERING FILTER',
        specifications: {
            type: 'Spin-On Power Steering',
            efficiency: '10 micron'
        },
        cross_references: {},
        applications: ['Heavy Duty Power Steering Systems']
    },
    
    // ========== AF-SERIES (OEM Cross-Reference - Air Filters) ==========
    'AF25139': {
        family: 'AIRE',
        type: 'AIR FILTER, PRIMARY RADIALSEAL',
        specifications: {
            media_type: 'Cellulose',
            style: 'Radialseal',
            efficiency: '99.5% @ 25 micron'
        },
        cross_references: {
            'DONALDSON-P527682': 'AF25139',
            'RS3518': 'AF25139'
        },
        applications: ['Heavy Duty Air Filtration']
    }
};

/**
 * Detect FRAM series type from code
 */
function detectFramSeriesType(code) {
    const normalized = code.toUpperCase();
    
    if (normalized.startsWith('PH')) return 'PH';
    if (normalized.startsWith('TG')) return 'TG';
    if (normalized.startsWith('XG')) return 'XG';
    if (normalized.startsWith('HM')) return 'HM';
    if (normalized.startsWith('CH')) return 'CH';
    if (normalized.startsWith('CA')) return 'CA';
    if (normalized.startsWith('CF')) return 'CF';
    if (normalized.startsWith('AF')) return 'AF';
    if (normalized.startsWith('G')) return 'G';
    if (normalized.startsWith('PS')) return 'PS';
    
    return null;
}

/**
 * Detect family from FRAM code
 */
function detectFramFamilyFromCode(code) {
    const normalized = code.toUpperCase();
    const series = detectFramSeriesType(normalized);
    
    if (series === 'PH' || series === 'HM' || series === 'G') return 'OIL';
    if (series === 'TG') return 'TRANSMISSION';
    if (series === 'XG') return 'OIL';
    if (series === 'CH') return 'COOLANT';
    if (series === 'CA') return 'AIRE';
    if (series === 'CF') return 'CABIN AIR';
    if (series === 'AF') return 'AIRE';
    if (series === 'PS') return 'POWER STEERING';
    
    return null;
}

/**
 * Find FRAM code from cross-reference
 */
function findFramCode(inputCode) {
    const normalized = String(inputCode || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
    
    // Direct lookup
    if (FRAM_DATABASE[normalized]) {
        return normalized;
    }
    
    // Search in cross-references
    for (const [framCode, filterData] of Object.entries(FRAM_DATABASE)) {
        const xrefs = filterData?.cross_references || {};
        for (const [xrefCode] of Object.entries(xrefs)) {
            const xrefNormalized = String(xrefCode || '')
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '');
            
            if (xrefNormalized === normalized || xrefNormalized.includes(normalized)) {
                return framCode;
            }
        }
    }
    
    return null;
}

/**
 * Main scraper function
 */
async function scrapeFram(code) {
    try {
        console.log(`📡 FRAM scraper: ${code}`);
        
        const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
        
        // Try cross-reference lookup
        let framCode = findFramCode(normalized);
        
        if (framCode && FRAM_DATABASE[framCode]) {
            const filter = FRAM_DATABASE[framCode];
            const series = detectFramSeriesType(framCode);
            
            console.log(`✅ Found via cross-reference: ${code} → ${framCode} (${series}-series)`);
            
            const crossTokens = Object.keys(filter.cross_references || {});
            return {
                found: true,
                code: framCode,
                original_code: code,
                series: series,
                family_hint: filter.family,
                cross: crossTokens,
                applications: filter.applications || [],
                attributes: filter.specifications || {}
            };
        }
        
        // Try direct lookup
        if (FRAM_DATABASE[normalized]) {
            const filter = FRAM_DATABASE[normalized];
            const series = detectFramSeriesType(normalized);
            
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
        const series = detectFramSeriesType(normalized);
        const detectedFamily = detectFramFamilyFromCode(normalized);
        if (series && detectedFamily && /^[A-Z]{1,2}\d{4,6}/.test(normalized)) {
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
        console.log(`⚠️  FRAM filter not found: ${code}`);
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
        console.error(`❌ FRAM scraper error: ${error.message}`);
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
async function validateFramCode(inputCode) {
    const normalized = String(inputCode || '').toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
    try {
        const result = await scrapeFram(normalized);
        if (result && result.found) {
            const family = result.family_hint || detectFramFamilyFromCode(result.code) || null;
            const last4 = extract4Digits(result.code);
            return {
                valid: true,
                code: result.code,
                source: 'FRAM',
                family,
                duty: 'HD',
                last4,
                cross: result.cross || [],
                applications: result.applications || [],
                attributes: {
                    ...(result.attributes || {}),
                    series: result.series || detectFramSeriesType(result.code) || null
                }
            };
        }
        return { valid: false, code: normalized, reason: 'NOT_FOUND_FRAM' };
    } catch (e) {
        return { valid: false, code: normalized, reason: 'FRAM_ERROR', message: e?.message };
    }
}

module.exports = {
    scrapeFram,
    FRAM_DATABASE,
    findFramCode,
    detectFramSeriesType,
    detectFramFamilyFromCode,
    validateFramCode
};

