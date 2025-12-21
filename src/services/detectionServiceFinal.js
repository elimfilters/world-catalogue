// ============================================================================
// ELIMFILTERS — DETECTION SERVICE FINAL (HARDENED)
// Autoridad técnica + generación SKU + hardening MARINE
// ============================================================================

const { normalizeResponse } = require('./responseNormalizer');
const prefixMap = require('../config/prefixMap');
const { scraperBridge } = require('../scrapers/scraperBridge');
const mongoDB = require('../scrapers/mongoDBScraper');
const { generateSKU, generateEM9SubtypeSKU } = require('../sku/generator');

// ============================================================================
// HARDENING MARINE — VALIDACIÓN EN RUNTIME (NO INFIERA)
// ============================================================================

function validateMarineRuntime({ source, family, duty, sku }) {
  if (duty !== 'MARINE') return;

  const allowedSources = ['RACOR', 'SIERRA'];
  if (!allowedSources.includes(source)) {
    throw new Error(`MARINE_INVALID_SOURCE:${source}`);
  }

  if (!sku || !sku.startsWith('EM9')) {
    throw new Error('MARINE_INVALID_SKU');
  }

  const allowedFamilies = ['FUEL', 'OIL', 'AIR'];
  if (!allowedFamilies.includes(family)) {
    throw new Error(`MARINE_INVALID_FAMILY:${family}`);
  }
}

// ============================================================================
// DETECTOR PRINCIPAL
// ============================================================================

async function detectPartNumber(rawCode) {
  const normalized = prefixMap.normalize(rawCode);

  // --------------------------------------------------------------------------
  // 1. VALIDACIÓN DE FORMA (NO DECIDE PRODUCTO)
  // --------------------------------------------------------------------------
  const validation = prefixMap.validate(normalized);
  if (!validation.valid) {
    return normalizeResponse({
      status: 'REJECTED',
      source: 'INPUT',
      normalized_query: normalized,
      reason: 'INVALID_CODE_FORMAT'
    });
  }

  // --------------------------------------------------------------------------
  // 2. SI ES SKU ELIMFILTERS → SOLO MONGODB
  // --------------------------------------------------------------------------
  if (isElimfiltersSKU(normalized)) {
    const found = await mongoDB.findBySKU(normalized);

    if (!found) {
      return normalizeResponse({
        status: 'NOT_FOUND',
        source: 'ELIMFILTERS',
        sku: normalized,
        normalized_query: normalized,
        reason: 'SKU_ELIMFILTERS_NOT_FOUND'
      });
    }

    return normalizeResponse({
      status: 'OK',
      source: 'ELIMFILTERS',
      sku: found.sku,
      family: found.family,
      duty: found.duty,
      attributes: found.attributes || {},
      cross: found.cross || [],
      applications: found.applications || [],
      normalized_query: normalized
    });
  }

  // --------------------------------------------------------------------------
  // 3. AUTORIDAD TÉCNICA (SCRAPERS)
  // --------------------------------------------------------------------------
  const authority = await scraperBridge(normalized);

  if (!authority) {
    return normalizeResponse({
      status: 'NOT_FOUND',
      source: 'UNKNOWN',
      normalized_query: normalized,
      reason: 'NO_AUTHORITY_MATCH'
    });
  }

  const { source, facts } = authority;
  const { family, duty, last4, attributes = {}, cross = [], applications = [] } = facts;

  // --------------------------------------------------------------------------
  // 4. GENERACIÓN SKU
  // --------------------------------------------------------------------------
  let sku = null;

  if (duty === 'MARINE') {
    sku = generateEM9SubtypeSKU(family, last4);
  } else {
    sku = generateSKU(family, duty, last4, { rawCode: normalized });
  }

  if (sku?.error) {
    return normalizeResponse({
      status: 'ERROR',
      source,
      normalized_query: normalized,
      reason: sku.error
    });
  }

  // --------------------------------------------------------------------------
  // 5. HARDENING MARINE (CRÍTICO)
  // --------------------------------------------------------------------------
  validateMarineRuntime({
    source,
    family,
    duty,
    sku
  });

  // --------------------------------------------------------------------------
  // 6. RESPUESTA FINAL NORMALIZADA
  // --------------------------------------------------------------------------
  return normalizeResponse({
    status: 'OK',
    source,
    sku,
    family,
    duty,
    attributes,
    cross,
    applications,
    normalized_query: normalized
  });
}

// ============================================================================
// HELPERS
// ============================================================================

function isElimfiltersSKU(code) {
  return /^EL8|^EF9|^EA1|^EC1|^EH6|^ES9|^EW7|^EA2|^EK3|^EK5|^EM9|^ET9/.test(code);
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  detectPartNumber
};
