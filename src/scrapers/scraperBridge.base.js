// ============================================================================
// SCRAPER BRIDGE - Donaldson-first strategy
// Regla principal: Buscar en Donaldson primero; luego FRAM según duty
// ============================================================================

const { validateDonaldsonCode } = require('./donaldson');
const { validateFramCode } = require('./fram');
const prefixMap = require('../config/prefixMap');

/**
 * Bridge to determine which scraper to use
 * CRITICAL RULE: Only Donaldson (HD) or FRAM (LD) codes are valid for SKU generation
 * Other brands (Fleetguard, Baldwin, WIX) must be rejected or cross-referenced
 */
async function scraperBridge(code, duty) {
    const normalizedCode = prefixMap.normalize(code);
    
    console.log(`🌉 Scraper Bridge: ${normalizedCode} | Duty: ${duty}`);

    const { brand, family, duty: dutyByPrefix, prefix } = prefixMap.resolveBrandFamilyDutyByPrefix(normalizedCode);
    const effectiveDuty = dutyByPrefix || duty || null;

    // =========================================================================
    // STEP 1: Try DONALDSON first (principal rule)
    // =========================================================================
    console.log(`📡 Trying Donaldson first (strict series match)...`);
    if (prefixMap.DONALDSON_STRICT_REGEX.test(normalizedCode) || brand === 'DONALDSON' || !brand) {
        const don = await validateDonaldsonCode(normalizedCode);
        if (don && don.valid) {
            return don;
        }
    }

    // =========================================================================
    // STEP 2: Try FRAM based on duty or as fallback
    // =========================================================================
    if ((effectiveDuty === 'LD') || brand === 'FRAM') {
        console.log(`📡 Trying FRAM for LD duty...`);
        const fr = await validateFramCode(normalizedCode);
        if (fr && fr.valid) return fr;
    }

    // Clasificación por prefijo cuando no hay homologación
    if (brand && brand !== 'DONALDSON' && brand !== 'FRAM') {
        console.log(`ℹ️ Classified by prefix: ${brand} | family=${family} | duty=${effectiveDuty}`);
        return { valid: false, code: normalizedCode, source: brand, family, duty: effectiveDuty, prefix, reason: 'CLASSIFIED_BY_PREFIX' };
    }

    console.log(`❌ No scraper found for code: ${normalizedCode}`);
    return { valid: false, code: normalizedCode, reason: 'NOT_FOUND_IN_SCRAPERS', prefix, brand_hint: brand || null, family_hint: family || null, duty_hint: effectiveDuty || null };
}

/**
 * Check if code is Donaldson (any series)
 */
function isDonaldsonCode(code) {
    return prefixMap.DONALDSON_STRICT_REGEX.test(prefixMap.normalize(code));
}

/**
 * Check if code is FRAM
 */
function isFramCode(code) {
    // FRAM series patterns
    const framPatterns = [
        /^PH\d{3,5}[A-Z]?$/,        // Oil Standard
        /^TG\d{3,5}[A-Z]?$/,        // Oil Tough Guard
        /^XG\d{3,5}[A-Z]?$/,        // Oil Extra Guard
        /^HM\d{3,5}[A-Z]?$/,        // Oil High Mileage
        /^CA\d{3,5}[A-Z]?$/,        // Air
        /^CF\d{3,5}[A-Z]?$/,        // Cabin FreshBreeze
        /^CH\d{3,5}[A-Z]?$/,        // Cabin Standard
        /^G\d{3,5}[A-Z]?$/,         // Fuel In-Line
        /^PS\d{3,5}[A-Z]?$/         // Fuel Separator
    ];
    
    return framPatterns.some(pattern => pattern.test(code));
}

/**
 * Get rejected brands list (for error messages)
 */
function getRejectedBrands() {
    return [
        'LF (Fleetguard)',
        'B (Baldwin)',
        '51xxx (WIX)',
        'ML (Mann Filter)',
        'And other non-Donaldson/FRAM brands'
    ];
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    scraperBridge,
    isDonaldsonCode,
    isFramCode,
    getRejectedBrands
};
