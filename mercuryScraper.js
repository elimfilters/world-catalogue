// ============================================================================
// MERCURY SCRAPER - Complete Version with Database
// Supports: 35-XXXXXX format marine engines
// ============================================================================

const axios = require('axios');
const { extract4Digits } = require('../utils/digitExtractor');
const prefixMap = require('../config/prefixMap');

const MERCURY_DATABASE = {
    '35881754': {
        family: 'OIL',
        type: 'OIL FILTER, MARINE SPIN-ON',
        specifications: {
            efficiency: '99% @ 21 micron',
            media_type: 'Cellulose'
        },
        cross_references: {},
        applications: ['Mercury In-Line Diesel', 'Marine Engines']
    },
    '8M0151085': {
        family: 'OIL',
        type: 'OIL FILTER, MARINE SPIN-ON',
        specifications: {
            efficiency: '99% @ 10 micron',
            media_type: 'Premium Marine Cellulose'
        },
        cross_references: {},
        applications: ['Mercury V8 Gasoline']
    },
    '35-42038T4': {
        family: 'OIL',
        type: 'OIL FILTER, MARINE SPIN-ON',
        specifications: {
            efficiency: '99.5% @ 15 micron',
            media_type: 'Marine Grade'
        },
        cross_references: {},
        applications: ['Mercury Marine Engines']
    },
    '35-864808T': {
        family: 'FUEL',
        type: 'FUEL FILTER, MARINE SPIN-ON',
        specifications: {
            efficiency: '10 micron',
            type: 'Spin-On Fuel Filter',
            media_type: 'Marine Fuel Media'
        },
        cross_references: {},
        applications: ['Marine Fuel Systems', 'Mercury Inboards']
    },
    '8M0192102': {
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
    '35-38814T': {
        family: 'FUEL',
        type: 'FUEL FILTER, MARINE PRIMARY',
        specifications: {
            efficiency: '20 micron',
            type: 'In-line Primary Fuel Filter'
        },
        cross_references: {},
        applications: ['Mercury Fuel Supply Systems']
    },
    '35-864001T': {
        family: 'TRANSMISSION',
        type: 'TRANSMISSION FILTER, MARINE',
        specifications: {
            efficiency: '25 micron',
            type: 'Transmission Filter',
            application: 'Marine Gearbox'
        },
        cross_references: {},
        applications: ['Mercury Marine Transmissions']
    },
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
    '8M0058516': {
        family: 'COOLANT',
        type: 'COOLANT FILTER, MARINE',
        specifications: {
            efficiency: '40 micron',
            type: 'Spin-On Coolant'
        },
        cross_references: {},
        applications: ['Mercury Engine Cooling']
    },
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
    },
    '35-42038R': {
        family: 'HYDRAULIC',
        type: 'HYDRAULIC FILTER, MARINE SPIN-ON',
        specifications: {
            efficiency: '10 micron',
            type: 'Spin-On Hydraulic Filter'
        },
        cross_references: {},
        applications: ['Marine Hydraulic Systems']
    }
};

function detectMercurySeriesType(code) {
    const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (normalized.startsWith('35')) return 'MERCURY_35';
    if (normalized.startsWith('8M')) return 'MERCURY_8M';
    if (normalized.length >= 6) return 'MERCURY';
    return null;
}

function detectMercuryFamilyFromCode(code) {
    const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (normalized.includes('881754') || normalized.includes('151085') || normalized.includes('42038T4')) return 'OIL';
    if (normalized.includes('864808') || normalized.includes('192102') || normalized.includes('38814T')) return 'FUEL';
    if (normalized.includes('864001')) return 'TRANSMISSION';
    if (normalized.includes('804201') || normalized.includes('58516')) return 'COOLANT';
    if (normalized.includes('818662')) return 'AIRE';
    if (normalized.includes('42038R')) return 'HYDRAULIC';
    return null;
}

function findMercuryCode(inputCode) {
    const normalized = String(inputCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (MERCURY_DATABASE[normalized]) return normalized;
    for (const [mercuryCode, filterData] of Object.entries(MERCURY_DATABASE)) {
        const xrefs = filterData?.cross_references || {};
        for (const [xrefCode] of Object.entries(xrefs)) {
            const xrefNormalized = String(xrefCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (xrefNormalized === normalized || xrefNormalized.includes(normalized)) {
                return mercuryCode;
            }
        }
    }
    return null;
}

async function scrapeMercury(code) {
    try {
        console.log(\📡 Mercury scraper: \\);
        const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
        let mercuryCode = findMercuryCode(normalized);
        if (mercuryCode && MERCURY_DATABASE[mercuryCode]) {
            const filter = MERCURY_DATABASE[mercuryCode];
            const series = detectMercurySeriesType(mercuryCode);
            console.log(\✅ Found via cross-reference: \ → \ (\)\);
            const crossTokens = Object.keys(filter.cross_references || {});
            return {
                found: true,
                code: mercuryCode,
                original_code: code,
                series: series,
                family_hint: filter.family,
                cross: crossTokens,
                applications: filter.applications || [],
                attributes: filter.specifications || {}
            };
        }
        if (MERCURY_DATABASE[normalized]) {
            const filter = MERCURY_DATABASE[normalized];
            const series = detectMercurySeriesType(normalized);
            console.log(\✅ Found directly: \ (\)\);
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
        const series = detectMercurySeriesType(normalized);
        const detectedFamily = detectMercuryFamilyFromCode(normalized);
        if (series && detectedFamily && /^(35|8M)\d{4,}/.test(normalized)) {
            console.log(\✅ Pattern accepted: \ → \, \\);
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
        console.log(\⚠️  Mercury filter not found: \\);
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
        console.error(\❌ Mercury scraper error: \\);
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

async function validateMercuryCode(inputCode) {
    const normalized = String(inputCode || '').toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
    try {
        const result = await scrapeMercury(normalized);
        if (result && result.found) {
            const family = result.family_hint || detectMercuryFamilyFromCode(result.code) || null;
            const last4 = String(result.code).slice(-4);
            return {
                valid: true,
                code: result.code,
                source: 'MERCURY',
                family,
                duty: 'MARINE',
                last4,
                cross: result.cross || [],
                applications: result.applications || [],
                attributes: {
                    ...(result.attributes || {}),
                    series: result.series || detectMercurySeriesType(result.code) || null
                }
            };
        }
        return { valid: false, code: normalized, reason: 'NOT_FOUND_MERCURY' };
    } catch (e) {
        return { valid: false, code: normalized, reason: 'MERCURY_ERROR', message: e?.message };
    }
}

module.exports = {
    scrapeMercury,
    MERCURY_DATABASE,
    findMercuryCode,
    detectMercurySeriesType,
    detectMercuryFamilyFromCode,
    validateMercuryCode
};
