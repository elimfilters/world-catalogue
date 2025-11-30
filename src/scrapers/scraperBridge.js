// ============================================================================
// SCRAPER BRIDGE - Donaldson-first strategy with OEM→FRAM resolution
// Regla principal: Buscar en Donaldson primero; luego FRAM según duty
// Además: si el código es OEM (Toyota 90915-****, etc.), intentar homologar a FRAM
// ============================================================================

const { validateDonaldsonCode } = require('./donaldson');
const { validateFramCode, resolveFramByCuratedOEM } = require('./fram');
const prefixMap = require('../config/prefixMap');

// Curado mínimo para LD homologación por OEM (sin dependencias externas)
const CURATED_OEM_TO_FRAM = {
    '90915-YZZN1': 'PH4967',
    '90915YZZN1': 'PH4967'
};

function maybeResolveFramFromOEM(code) {
    const q = code.toUpperCase().replace(/\s+/g, '');
    const hit = CURATED_OEM_TO_FRAM[q];
    return hit ? hit : null;
}

/**
 * Bridge para decidir qué scraper usar
 * Regla CRÍTICA: Solo códigos Donaldson (HD) o FRAM (LD) son válidos para generar SKU
 * Otras marcas (Fleetguard, Baldwin, WIX) se rechazan o se cruzan
 */
async function scraperBridge(code, duty) {
    const normalizedCode = prefixMap.normalize(code);
    const hint = prefixMap.resolveBrandFamilyDutyByPrefix(normalizedCode) || {};
    // If hint suggests a duty, prefer it over caller-provided
    const effectiveDuty = hint.duty || duty;

    console.log(`🌉 Scraper Bridge: ${normalizedCode} | Duty: ${effectiveDuty} | Hint: ${hint.brand || 'N/A'}/${hint.family || 'N/A'}`);

    // =========================================================================
    // PASO 1: Intentar DONALDSON primero (regla principal)
    // =========================================================================
    console.log(`📡 Trying Donaldson first (strict series match)...`);
    // Permitir intento de Donaldson cuando el duty efectivo es HD,
    // incluso si el código no coincide con el regex estricto.
    if (prefixMap.DONALDSON_STRICT_REGEX.test(normalizedCode) || hint.brand === 'DONALDSON' || effectiveDuty === 'HD') {
        const don = await validateDonaldsonCode(normalizedCode);
        if (don && don.valid) {
            return don;
        }
    }

    // =========================================================================
    // PASO 2: Intentar FRAM por duty o como fallback
    // =========================================================================
    if (effectiveDuty === 'LD' || hint.brand === 'FRAM') {
        console.log(`📡 Trying FRAM for LD duty...`);
        const fr = await validateFramCode(normalizedCode);
        if (fr && fr.valid) return fr;

        // OEM→FRAM resolución curada (p.e. Toyota 90915-YZZN1 → PH4967)
        // Primero intentar resolver usando listas curadas globales de fram.js
        let resolvedFram = resolveFramByCuratedOEM(normalizedCode);
        if (!resolvedFram) {
            // Fallback adicional local
            resolvedFram = maybeResolveFramFromOEM(normalizedCode);
        }
        if (resolvedFram) {
            const fr2 = await validateFramCode(resolvedFram);
            if (fr2 && fr2.valid) {
                fr2.resolved_from_oem = normalizedCode;
                return fr2;
            }
        }
    } else {
        // Norma estricta: HD → Donaldson únicamente. Omitir FRAM para duty HD.
        console.log(`⛔ Duty HD: FRAM omitido por norma (HD→Donaldson, LD→FRAM)`);
    }

    console.log(`❌ No scraper found for code: ${normalizedCode}`);
    return {
        valid: false,
        code: normalizedCode,
        reason: 'NOT_FOUND_IN_SCRAPERS',
        brand_hint: hint.brand || null,
        family_hint: hint.family || null,
        duty_hint: hint.duty || null
    };
}

function isDonaldsonCode(code) {
    return prefixMap.DONALDSON_STRICT_REGEX.test(prefixMap.normalize(code));
}

function isFramCode(code) {
    const framPatterns = [
        /^PH\d{3,5}[A-Z]?$/,
        /^TG\d{3,5}[A-Z]?$/,
        /^XG\d{3,5}[A-Z]?$/,
        /^HM\d{3,5}[A-Z]?$/,
        /^CA\d{3,5}[A-Z]?$/,
        /^CF\d{3,5}[A-Z]?$/,
        /^CH\d{3,5}[A-Z]?$/,
        /^G\d{3,5}[A-Z]?$/,
        /^PS\d{3,5}[A-Z]?$/
    ];
    return framPatterns.some(pattern => pattern.test(code));
}

function getRejectedBrands() {
    return [
        'LF (Fleetguard)',
        'B (Baldwin)',
        '51xxx (WIX)',
        'ML (Mann Filter)',
        'And other non-Donaldson/FRAM brands'
    ];
}

module.exports = {
    scraperBridge,
    isDonaldsonCode,
    isFramCode,
    getRejectedBrands
};