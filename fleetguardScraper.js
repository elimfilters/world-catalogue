// ============================================================================
// FLEETGUARD SCRAPER - Complete Version with Database
// Supports: LF, FF, AF, WF, HF, FS series
// ============================================================================

const axios = require('axios');
const { extract4Digits } = require('../utils/digitExtractor');
const prefixMap = require('../config/prefixMap');

/**
 * Comprehensive Fleetguard database
 */
const FLEETGUARD_DATABASE = {
    // ========== LF-SERIES (Lube Filters) ==========
    'LF3620': {
        family: 'OIL',
        type: 'LUBE FILTER, SPIN-ON',
        specifications: {
            thread_size: 'M20 x 1.5',
            outer_diameter: '76 mm',
            height: '102 mm',
            efficiency: '99% @ 21 micron',
            media_type: 'Cellulose'
        },
        cross_references: {
            'DONALDSON-P552100': 'LF3620',
            'FRAM-PH7405': 'LF3620',
            'BALDWIN-B495': 'LF3620',
            'CATERPILLAR-3I1882': 'LF3620'
        },
        applications: ['Detroit Diesel', 'Cummins', 'Freightliner']
    },
    'LF9009': {
        family: 'OIL',
        type: 'LUBE FILTER, SPIN-ON EXTENDED SERVICE',
        specifications: {
            efficiency: '99% @ 21 micron',
            media_type: 'Cellulose Extended',
            bypass: 'Full flow',
            service_interval: 'Extended'
        },
        cross_references: {},
        applications: ['Cummins ISX', 'Peterbilt']
    },
    'LF16135': {
        family: 'OIL',
        type: 'LUBE FILTER, SPIN-ON',
        specifications: {
            efficiency: '99% @ 10 micron',
            media_type: 'Premium cellulose'
        },
        cross_references: {},
        applications: ['Heavy Duty Diesel']
    },
    
    // ========== FF-SERIES (Fuel Filters) ==========
    'FF5052': {
        family: 'FUEL',
        type: 'FUEL FILTER, PRIMARY',
        specifications: {
            efficiency: '30 micron',
            media_type: 'Cellulose',
            type: 'In-line Primary'
        },
        cross_references: {},
        applications: ['Heavy Duty Fuel Systems']
    },
    'FF5421': {
        family: 'FUEL',
        type: 'FUEL FILTER, WATER SEPARATOR',
        specifications: {
            efficiency: '10 micron',
            type: 'Water Separator',
            function: 'Fuel Filtration + Water Removal'
        },
        cross_references: {},
        applications: ['Diesel Engines with Water Removal']
    },
    
    // ========== AF-SERIES (Air Filters) ==========
    'AF25139': {
        family: 'AIRE',
        type: 'AIR FILTER, PRIMARY RADIALSEAL',
        specifications: {
            efficiency: '99.5% @ 25 micron',
            media_type: 'Cellulose',
            style: 'Radialseal'
        },
        cross_references: {
            'DONALDSON-P527682': 'AF25139',
            'WIX-46556': 'AF25139'
        },
        applications: ['Heavy Duty Air Filtration', 'Freightliner', 'Cummins']
    },
    'AF26162': {
        family: 'AIRE',
        type: 'AIR FILTER, SECONDARY',
        specifications: {
            efficiency: '99.9% @ 10 micron',
            media_type: 'Cellulose Secondary'
        },
        cross_references: {},
        applications: ['Heavy Duty Air Systems']
    },
    
    // ========== WF-SERIES (Water Filters/Coolant) ==========
    'WF2076': {
        family: 'COOLANT',
        type: 'COOLANT FILTER, SPIN-ON',
        specifications: {
            efficiency: '40 micron',
            type: 'Spin-On Coolant Filter'
        },
        cross_references: {},
        applications: ['Heavy Duty Cooling Systems']
    },
    
    // ========== HF-SERIES (Hydraulic Filters) ==========
    'HF6001': {
        family: 'HYDRAULIC',
        type: 'HYDRAULIC FILTER, SPIN-ON',
        specifications: {
            efficiency: '10 micron',
            type: 'Spin-On Hydraulic'
        },
        cross_references: {},
        applications: ['Heavy Duty Hydraulic Systems']
    },
    
    // ========== FS-SERIES (Fuel/Separator) ==========
    'FS1012': {
        family: 'FUEL',
        type: 'FUEL FILTER, SPIN-ON SEPARATOR',
        specifications: {
            efficiency: '10 micron',
            type: 'Spin-On Fuel Separator',
            function: 'Fuel Filtration + Water Separation'
        },
        cross_references: {},
        applications: ['Marine/Industrial Diesel']
    }
};

/**
 * Detect Fleetguard series type from code
 */
function detectFleetguardSeriesType(code) {
    const normalized = code.toUpperCase();
    
    if (normalized.startsWith('LF')) return 'LF';
    if (normalized.startsWith('FF')) return 'FF';
    if (normalized.startsWith('AF')) return 'AF';
    if (normalized.startsWith('WF')) return 'WF';
    if (normalized.startsWith('HF')) return 'HF';
    if (normalized.startsWith('FS')) return 'FS';
    
    return null;
}

/**
 * Detect family from Fleetguard code
 */
function detectFleetguardFamilyFromCode(code) {
    const normalized = code.toUpperCase();
    const series = detectFleetguardSeriesType(normalized);
    
    if (series === 'LF') return 'OIL';
    if (series === 'FF' || series === 'FS') return 'FUEL';
    if (series === 'AF') return 'AIRE';
    if (series === 'WF') return 'COOLANT';
    if (series === 'HF') return 'HYDRAULIC';
    
    return null;
}

/**
 * Find Fleetguard code from cross-reference
 */
function findFleetguardCode(inputCode) {
    const normalized = String(inputCode || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
    
    // Direct lookup
    if (FLEETGUARD_DATABASE[normalized]) {
        return normalized;
    }
    
    // Search in cross-references
    for (const [fleetguardCode, filterData] of Object.entries(FLEETGUARD_DATABASE)) {
        const xrefs = filterData?.cross_references || {};
        for (const [xrefCode] of Object.entries(xrefs)) {
            const xrefNormalized = String(xrefCode || '')
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '');
            
            if (xrefNormalized === normalized || xrefNormalized.includes(normalized)) {
                return fleetguardCode;
            }
        }
    }
    
    return null;
}

/**
 * Main scraper function
 */
async function scrapeFleetguard(code) {
    try {
        console.log(`📡 Fleetguard scraper: ${code}`);
        
        const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
        
        // Try cross-reference lookup
        let fleetguardCode = findFleetguardCode(normalized);
        
        if (fleetguardCode && FLEETGUARD_DATABASE[fleetguardCode]) {
            const filter = FLEETGUARD_DATABASE[fleetguardCode];
            const series = detectFleetguardSeriesType(fleetguardCode);
            
            console.log(`✅ Found via cross-reference: ${code} → ${fleetguardCode} (${series}-series)`);
            
            const crossTokens = Object.keys(filter.cross_references || {});
            return {
                found: true,
                code: fleetguardCode,
                original_code: code,
                series: series,
                family_hint: filter.family,
                cross: crossTokens,
                applications: filter.applications || [],
                attributes: filter.specifications || {}
            };
        }
        
        // Try direct lookup
        if (FLEETGUARD_DATABASE[normalized]) {
            const filter = FLEETGUARD_DATABASE[normalized];
            const series = detectFleetguardSeriesType(normalized);
            
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
        const series = detectFleetguardSeriesType(normalized);
        const detectedFamily = detectFleetguardFamilyFromCode(normalized);
        if (series && detectedFamily && /^[A-Z]{2}\d{4,5}/.test(normalized)) {
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
        console.log(`⚠️  Fleetguard filter not found: ${code}`);
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
        console.error(`❌ Fleetguard scraper error: ${error.message}`);
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
async function validateFleetguardCode(inputCode) {
    const normalized = String(inputCode || '').toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
    try {
        const result = await scrapeFleetguard(normalized);
        if (result && result.found) {
            const family = result.family_hint || detectFleetguardFamilyFromCode(result.code) || null;
            const last4 = extract4Digits(result.code);
            return {
                valid: true,
                code: result.code,
                source: 'FLEETGUARD',
                family,
                duty: 'HD',
                last4,
                cross: result.cross || [],
                applications: result.applications || [],
                attributes: {
                    ...(result.attributes || {}),
                    series: result.series || detectFleetguardSeriesType(result.code) || null
                }
            };
        }
        return { valid: false, code: normalized, reason: 'NOT_FOUND_FLEETGUARD' };
    } catch (e) {
        return { valid: false, code: normalized, reason: 'FLEETGUARD_ERROR', message: e?.message };
    }
}

module.exports = {
    scrapeFleetguard,
    FLEETGUARD_DATABASE,
    findFleetguardCode,
    detectFleetguardSeriesType,
    detectFleetguardFamilyFromCode,
    validateFleetguardCode
};
