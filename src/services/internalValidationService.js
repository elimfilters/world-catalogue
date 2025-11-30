// ============================================================================
// Internal Validation Service - Batch classification and report generation
// Consolidated, deterministic logic (offline) for trusted cross-reference
// ============================================================================

const { resolveBrandFamilyDutyByPrefix, normalize } = require('../config/prefixMap');
let OEM_XREF = {};
try { OEM_XREF = require('../data/oem_xref.json'); } catch (_) { OEM_XREF = {}; }
const { validateDonaldsonCode, findDonaldsonCode } = require('../scrapers/donaldson');
const { generateSKU } = require('../sku/generator');
const { extract4Digits } = require('../utils/digitExtractor');

async function classifyCode(rawCode) {
  const code = String(rawCode || '').trim();
  const ncode = normalize(code);

  const oemDirect = OEM_XREF[ncode];
  if (oemDirect) {
    const dutyGuess = 'HD';
    const last4 = extract4Digits(code);
    const sku = generateSKU(oemDirect.family, dutyGuess, last4);
    return {
      input: code,
      brand: oemDirect.brand,
      family: oemDirect.family,
      duty: dutyGuess,
      status: 'FINAL/Homologada',
      sku: typeof sku === 'string' ? sku : null,
      donaldson: null,
      prefix_collision: null
    };
  }
  const byPrefix = resolveBrandFamilyDutyByPrefix(code) || {};
  const brand = byPrefix.brand || null;
  let family = byPrefix.family || null;
  const duty = byPrefix.duty || null;

  // Additional hooks for Donaldson P55/P60 if not resolved by prefixMap
  if (brand === 'DONALDSON' && /^P/.test(code) && !family) {
    const n = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (/^P55\d{3,}/.test(n)) family = 'OIL';
    else if (/^P60\d{3,}/.test(n)) family = 'COOLANT';
  }

  let oemBridge = null;
  let finalSku = null;
  let don = null;

  const looksNumeric = /\d/.test(code) && !/[A-Z]{2,}/.test(code.replace(/\d/g, ''));
  const tryDonaldson = brand === 'DONALDSON' || looksNumeric || !brand;

  if (tryDonaldson) {
    don = await validateDonaldsonCode(code);
    if (don && don.valid) {
      family = family || don.family || null;
      oemBridge = {
        source: 'DONALDSON',
        code: don.code,
        series: don.attributes?.series || don.series || null,
        applications: don.applications || [],
        cross: don.cross || []
      };
      const last4 = don.last4 || extract4Digits(don.code);
      const sku = generateSKU(family || 'OIL', duty || 'HD', last4);
      if (typeof sku === 'string') finalSku = sku;
    } else {
      const dc = findDonaldsonCode(code);
      if (dc) {
        oemBridge = { source: 'DONALDSON', code: dc };
        const last4 = extract4Digits(dc);
        const sku = generateSKU(family || 'OIL', duty || 'HD', last4);
        if (typeof sku === 'string') finalSku = sku;
      }
    }
  }

  const status = (brand || oemBridge) ? 'FINAL/Homologada' : 'P4/NoClasificado';

  return {
    input: code,
    brand,
    family,
    duty,
    status,
    sku: finalSku || null,
    donaldson: oemBridge,
    prefix_collision: byPrefix.collision || null
  };
}

async function validateBatch(codes = []) {
  const results = [];
  for (const c of codes) {
    // eslint-disable-next-line no-await-in-loop
    const r = await classifyCode(c);
    results.push(r);
  }
  const summary = {
    total: results.length,
    by_status: results.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {}),
    by_family: results.reduce((acc, r) => {
      const f = r.family || 'N/A';
      acc[f] = (acc[f] || 0) + 1;
      return acc;
    }, {}),
    brands: results.reduce((acc, r) => {
      const b = r.brand || 'N/A';
      acc[b] = (acc[b] || 0) + 1;
      return acc;
    }, {})
  };
  return { results, summary };
}

module.exports = {
  classifyCode,
  validateBatch
};
