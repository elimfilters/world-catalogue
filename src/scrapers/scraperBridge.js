@'
// ============================================================================
// SCRAPER BRIDGE - FIXED v5.3.4
// ============================================================================

const { validateDonaldsonCode } = require('./donaldson');
const { validateFramCode } = require('./fram');
const { extract4Digits, extract4Alnum } = require('../utils/digitExtractor');
const prefixMap = require('../config/prefixMap');

// Normalize function inline
function normalizeCode(rawCode) {
  if (!rawCode) return '';
  return String(rawCode).toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
}

const CURATED_OEM_TO_FRAM = {
    '90915-YZZN1': 'PH4967',
    '90915YZZN1': 'PH4967'
};

function maybeResolveFramFromOEM(code) {
    const q = code.toUpperCase().replace(/\s+/g, '');
    return CURATED_OEM_TO_FRAM[q] || null;
}

async function scraperBridge(code, duty) {
    const normalizedCode = normalizeCode(code);
    const hint = {}; // Removed non-existent function
    const effectiveDuty = hint.duty || duty || null;

    console.log(`🌉 Scraper Bridge: ${normalizedCode} | Duty: ${effectiveDuty}`);

    // Try Donaldson first
    console.log(`📡 Trying Donaldson first...`);
    const tryBoth = !effectiveDuty;
    if (tryBoth || prefixMap.DONALDSON_STRICT_REGEX.test(normalizedCode) || effectiveDuty === 'HD') {
        const don = await validateDonaldsonCode(normalizedCode);
        if (don && don.valid) return don;
    }

    // Try FRAM
    if (tryBoth || effectiveDuty === 'LD') {
        console.log(`📡 Trying FRAM for LD duty...`);
        const fr = await validateFramCode(normalizedCode);
        if (fr && fr.valid) return fr;
    }

    // Try MARINE validators
    const racor = validateRacorCode(normalizedCode);
    if (racor && racor.valid) return racor;
    
    const merc = validateMercruiserCode(normalizedCode);
    if (merc && merc.valid) return merc;
    
    const sierra = validateSierraCode(normalizedCode);
    if (sierra && sierra.valid) return sierra;

    console.log(`❌ No scraper found for code: ${normalizedCode}`);
    return {
        valid: false,
        code: normalizedCode,
        reason: 'NOT_FOUND_IN_SCRAPERS'
    };
}

function isDonaldsonCode(code) {
    return prefixMap.DONALDSON_STRICT_REGEX.test(normalizeCode(code));
}

function isFramCode(code) {
    const framPatterns = [
        /^PH\d{3,5}[A-Z]?$/, /^TG\d{3,5}[A-Z]?$/, /^XG\d{3,5}[A-Z]?$/,
        /^HM\d{3,5}[A-Z]?$/, /^CA\d{3,5}[A-Z]?$/, /^CF\d{3,5}[A-Z]?$/,
        /^CH\d{3,5}[A-Z]?$/, /^G\d{3,5}[A-Z]?$/, /^PS\d{3,5}[A-Z]?$/
    ];
    return framPatterns.some(pattern => pattern.test(code));
}

function validateRacorCode(code) {
    const up = String(code || '').toUpperCase();
    if (/^\d{3,5}(MA|FH)\b/.test(up)) {
        return { valid: true, code: up, last4: extract4Digits(up), last4_alnum: extract4Alnum(up), family: 'TURBINE SERIES', source: 'PARKER' };
    }
    if (/^(2010|2020|2040)[A-Z0-9]*$/.test(up)) {
        return { valid: true, code: up, last4: extract4Digits(up), last4_alnum: extract4Alnum(up), family: 'TURBINE SERIES', source: 'PARKER' };
    }
    if (/^R(12|15|20|25|45|60|90|120)(T|S)$/.test(up)) {
        return { valid: true, code: up, last4: extract4Digits(up), last4_alnum: extract4Alnum(up), family: 'MARINE', source: 'PARKER' };
    }
    return null;
}

function validateMercruiserCode(code) {
    const up = String(code || '').toUpperCase();
    if (/^(?:\d{2}-?\d{4,7}[A-Z]?|\d{2}-?8M\d{6,7}[A-Z]?)$/.test(up)) {
        return { valid: true, code: up, last4: extract4Digits(up), last4_alnum: extract4Alnum(up), family: 'MARINE', source: 'MERCRUISER' };
    }
    return null;
}

function validateSierraCode(code) {
    const up = String(code || '').toUpperCase();
    if (/^18-?\d{4,5}$/.test(up)) {
        return { valid: true, code: up, last4: extract4Digits(up), last4_alnum: extract4Alnum(up), family: 'MARINE', source: 'SIERRA' };
    }
    return null;
}

module.exports = { scraperBridge, isDonaldsonCode, isFramCode };
'@ | Set-Content "src\scrapers\scraperBridge.js"

git add src/scrapers/scraperBridge.js
git commit -m "fix: inline normalize in scraperBridge.js and remove non-existent function"
git push origin main

Start-Sleep -Seconds 120

Invoke-RestMethod -Uri "https://catalogo-production-e528.up.railway.app/api/detect/PH6607" | ConvertTo-Json -Depth 10
