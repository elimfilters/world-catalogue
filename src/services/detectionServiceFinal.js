// src/services/detectionServiceFinal.js

const { normalizeResponse } = require('./responseNormalizer');
const mongoDB = require('../scrapers/mongoDBScraper');
const { scraperBridge } = require('../scrapers/scraperBridge');
const { isElimfiltersSKU } = require('../utils/isElimfiltersSKU');
const prefixMap = require('../config/prefixMap');

async function detectPartNumber(rawCode) {
  const { valid, normalized } = prefixMap.validate(rawCode);

  if (!valid) {
    return normalizeResponse({
      status: 'REJECTED',
      source: 'INPUT_VALIDATION',
      normalized_query: normalized,
      reason: 'INVALID_CODE_FORMAT'
    });
  }

  // ------------------------------------------------------------
  // 1) SKU ELIMFILTERS → SOLO MongoDB
  // ------------------------------------------------------------
  if (isElimfiltersSKU(normalized)) {
    const record = await mongoDB.findBySKU(normalized);

    if (!record) {
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
      sku: record.sku,
      family: record.family,
      duty: record.duty,
      attributes: record.attributes || {},
      cross: record.cross || [],
      applications: record.applications || [],
      normalized_query: normalized
    });
  }

  // ------------------------------------------------------------
  // 2) OEM / Cross reference → scraperBridge
  // ------------------------------------------------------------
  const resolved = await scraperBridge(normalized);

  if (!resolved) {
    return normalizeResponse({
      status: 'NOT_FOUND',
      source: 'SCRAPER',
      normalized_query: normalized,
      reason: 'NO_AUTHORITY_CONFIRMED'
    });
  }

  return normalizeResponse({
    status: 'OK',
    source: resolved.source,
    family: resolved.facts.family || null,
    duty: resolved.facts.duty || null,
    attributes: resolved.facts.attributes || {},
    cross: resolved.facts.cross || [],
    applications: resolved.facts.applications || [],
    normalized_query: normalized
  });
}

module.exports = {
  detectPartNumber
};
