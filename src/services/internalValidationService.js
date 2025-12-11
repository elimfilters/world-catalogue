// ============================================================================
// Internal Validation Service - Hardened Version (Immutable SKU Contract)
// Clasificación determinística y segura. NO genera prefijos.
// Prefijos solo vienen desde:
//    /src/config/prefixes.js  (inmutable)
//    /src/sku/generator.js    (inmutable)
// ============================================================================

const { resolveBrandFamilyDutyByPrefix, normalize } = require('../config/prefixMap');
const { resolveFamilyDutyByOEMPrefix } = require('../config/oemPrefixRules');
let OEM_XREF = {};
try { OEM_XREF = require('../data/oem_xref.json'); } catch (_) { OEM_XREF = {}; }

const { validateDonaldsonCode, findDonaldsonCode } = require('../scrapers/donaldson');
const { generateSKU } = require('../sku/generator');
const { extract4Digits } = require('../utils/digitExtractor');

// ============================================================
// SINÓNIMOS DE FAMILIA PARA NORMALIZAR
// ============================================================

function normalizeFamily(f) {
  if (!f) return null;
  const x = String(f).trim().toUpperCase();

  const MAP = {
    // Oil
    "OIL": "OIL",
    "ENGINE OIL": "OIL",
    "LUBE": "OIL",
    "LUB": "OIL",

    // Air
    "AIR": "AIRE",
    "AIRE": "AIRE",
    "PRIMARY AIR": "AIRE",
    "SECONDARY AIR": "AIRE",
    "OUTER AIR": "AIRE",
    "INNER AIR": "AIRE",
    "AIR CLEANER": "AIRE",
    "AIR FILTER": "AIRE",

    // Cabin
    "CABIN": "CABIN",
    "CABIN AIR": "CABIN",
    "AC FILTER": "CABIN",
    "HVAC": "CABIN",

    // Fuel
    "FUEL": "FUEL",
    "DIESEL": "FUEL",
    "GASOLINE": "FUEL",
    "PRIMARY FUEL": "FUEL",
    "SECONDARY FUEL": "FUEL",

    // Separador / Water Separator
    "SEPARATOR": "SEPARATOR",
    "WATER SEPARATOR": "SEPARATOR",
    "FUEL WATER SEPARATOR": "SEPARATOR",

    // Hydraulic
    "HYD": "HYDRAULIC",
    "HYDRAULIC": "HYDRAULIC",

    // Coolant
    "COOLANT": "COOLANT",
    "ANTIFREEZE": "COOLANT",

    // Turbine
    "TURBINE": "TURBINE",

    // Marine
    "MARINE": "MARINE",
    "BOAT": "MARINE"
  };

  return MAP[x] || null;
}

// ============================================================
// CLASIFICADOR PRINCIPAL
// ============================================================

async function classifyCode(rawCode) {
  const code = String(rawCode || '').trim();
  const ncode = normalize(code);

  // ============================================================
  // 1) Coincidencia directa OEM_xref.json (la más confiable)
  // ============================================================
  const oemDirect = OEM_XREF[ncode];
  if (oemDirect) {
    const dutyGuess = 'HD';
    const last4 = extract4Digits(code);

    const safeFamily = normalizeFamily(oemDirect.family);
    const sku = generateSKU(safeFamily, dutyGuess, last4);

    return {
      input: code,
      brand: oemDirect.brand,
      family: safeFamily,
      duty: dutyGuess,
      status: 'FINAL/Homologada',
      sku: typeof sku === 'string' ? sku : null,
      donaldson: null,
      prefix_collision: null
    };
  }

  // ============================================================
  // 2) Detección primaria por prefijo OEM
  // ============================================================
  const byPrefix = resolveBrandFamilyDutyByPrefix(code) || {};
  const brand = byPrefix.brand || null;
  let family = normalizeFamily(byPrefix.family);
  const duty = byPrefix.duty || null;

  // ============================================================
  // 3) OEM Fallback universal (CAT, JD, Toyota, MANN WK, etc.)
  // ============================================================
  if (!family) {
    const oemResolved = resolveFamilyDutyByOEMPrefix(code, duty);
    if (oemResolved && oemResolved.family) {
      family = normalizeFamily(oemResolved.family);
    }
  }

  // ============================================================
  // 4) Donaldson extended P55 / P60 fallback
  // ============================================================
  if (brand === 'DONALDSON' && /^P/.test(code) && !family) {
    const n = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (/^P55\d{3,}/.test(n)) family = 'OIL';
    else if (/^P60\d{3,}/.test(n)) family = 'COOLANT';
  }

  let oemBridge = null;
  let finalSku = null;
  let don = null;

  const looksNumeric =
    /\d/.test(code) &&
    !/[A-Z]{2,}/.test(code.replace(/\d/g, ''));

  const tryDonaldson = brand === 'DONALDSON' || looksNumeric || !brand;

  // ============================================================
  // 5) Validación Donaldson
  // ============================================================
  if (tryDonaldson) {
    don = await validateDonaldsonCode(code);

    if (don && don.valid) {
      family = normalizeFamily(family || don.family || null);
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

// ============================================================
// PROCESAMIENTO POR LOTES
// ============================================================

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