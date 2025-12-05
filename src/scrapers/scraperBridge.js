// ============================================================================
// SCRAPER BRIDGE - Donaldson-first strategy with OEM→FRAM resolution
// Regla principal: Buscar en Donaldson primero; luego FRAM según duty
// Además: si el código es OEM (Toyota 90915-****, etc.), intentar homologar a FRAM
// ============================================================================

const { validateDonaldsonCode } = require('./donaldson');
const { validateFramCode, resolveFramByCuratedOEM } = require('./fram');
const { extract4Digits, extract4Alnum } = require('../utils/digitExtractor');
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
    // Si hint sugiere duty, preferirlo sobre el proporcionado; si ninguno, duty desconocido
    const effectiveDuty = hint.duty || duty || null;

    console.log(`🌉 Scraper Bridge: ${normalizedCode} | Duty: ${effectiveDuty} | Hint: ${hint.brand || 'N/A'}/${hint.family || 'N/A'}`);

    // =========================================================================
    // PASO 1: Intentar DONALDSON primero (regla principal)
    // =========================================================================
    console.log(`📡 Trying Donaldson first (strict series match)...`);
    const tryBoth = !effectiveDuty;
    // Intento de Donaldson: siempre si duty desconocido; de lo contrario, según norma HD
    if (tryBoth || prefixMap.DONALDSON_STRICT_REGEX.test(normalizedCode) || hint.brand === 'DONALDSON' || effectiveDuty === 'HD') {
        const don = await validateDonaldsonCode(normalizedCode);
        if (don && don.valid) {
            return don;
        }
    }

    // =========================================================================
    // PASO 2: Intentar FRAM por duty o como fallback
    // =========================================================================
    if (tryBoth || effectiveDuty === 'LD' || hint.brand === 'FRAM') {
        console.log(`📡 Trying FRAM for LD duty...`);
        const fr = await validateFramCode(normalizedCode);
        if (fr && fr.valid) return fr;

        // OEM→FRAM resolución curada (p.e. Toyota 90915-YZZN1 → PH4967)
        // Primero intentar resolver usando listas curadas globales de fram.js
        let resolvedFram = null; // resolveFramByCuratedOEM(normalizedCode);
        
        if (resolvedFram) {
            const fr2 = await validateFramCode(resolvedFram);
            if (fr2 && fr2.valid) {
                fr2.resolved_from_oem = normalizedCode;
                return fr2;
            }
        }
    } else if (!tryBoth) {
        // Norma estricta: HD → Donaldson únicamente. Omitir FRAM para duty HD.
        console.log(`⛔ Duty HD: FRAM omitido por norma (HD→Donaldson, LD→FRAM)`);
    }

    // =========================================================================
    // PASO 3: Intentar validadores OEM marinos (Parker/Racor, MerCruiser, Sierra)
    // =========================================================================
    const racor = validateRacorCode(normalizedCode);
    if (racor && racor.valid) {
        return racor;
    }
    const merc = validateMercruiserCode(normalizedCode);
    if (merc && merc.valid) {
        return merc;
    }
    const sierra = validateSierraCode(normalizedCode);
    if (sierra && sierra.valid) {
        return sierra;
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

// ----------------------------------------------------------------------------
// Validadores locales: Parker/Racor, MerCruiser, Sierra
// ----------------------------------------------------------------------------

function validateRacorCode(code) {
    const up = String(code || '').toUpperCase();
    // Sistemas Turbina (hardware/housing): 900MA, 1000FH, etc.
        if (/^\d{3,5}(MA|FH)\b/.test(up)) {
            return {
                valid: true,
                code: up,
                last4: extract4Digits(up),
                last4_alnum: extract4Alnum(up),
                family: 'TURBINE SERIES',
                source: 'PARKER'
            };
        }
    // Elementos Turbina (2010/2020/2040 + sufijos de micraje)
        if (/^(2010|2020|2040)[A-Z0-9]*$/.test(up)) {
            return {
                valid: true,
                code: up,
                last4: extract4Digits(up),
                last4_alnum: extract4Alnum(up),
                family: 'TURBINE SERIES',
                source: 'PARKER'
            };
        }
    // Separadores Parker/Racor (R12/R15/.../R120 con T/S)
        if (/^R(12|15|20|25|45|60|90|120)(T|S)$/.test(up)) {
            return {
                valid: true,
                code: up,
                last4: extract4Digits(up),
                last4_alnum: extract4Alnum(up),
                family: 'MARINE',
                source: 'PARKER'
            };
        }
    return null;
}

function validateMercruiserCode(code) {
    const up = String(code || '').toUpperCase();
    // Patrones comunes: 35-802893Q, 35-8xxxxxA/Q, 35-8M0065103 (permitir sin guión tras normalización)
        if (/^(?:\d{2}-?\d{4,7}[A-Z]?|\d{2}-?8M\d{6,7}[A-Z]?)$/.test(up)) {
            return {
                valid: true,
                code: up,
                last4: extract4Digits(up),
                last4_alnum: extract4Alnum(up),
                family: 'MARINE',
                source: 'MERCRUISER'
            };
        }
    return null;
}

function validateSierraCode(code) {
    const up = String(code || '').toUpperCase();
    // Patrones Sierra: 18-7911, 18-***** (permitir sin guión tras normalización)
        if (/^18-?\d{4,5}$/.test(up)) {
            return {
                valid: true,
                code: up,
                last4: extract4Digits(up),
                last4_alnum: extract4Alnum(up),
                family: 'MARINE',
                source: 'SIERRA'
            };
        }
    return null;
}

