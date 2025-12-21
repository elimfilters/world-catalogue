// ============================================================================
// DETECTION SERVICE — FINAL (v5.0.0)
// - Orquesta el flujo completo de detección
// - NO scrapea directamente
// - NO genera SKU fuera de reglas oficiales
// ============================================================================

const { scraperBridge } = require('../scrapers/scraperBridge');
const mongoScraper = require('../scrapers/mongoDBScraper');
const { normalizeResponse } = require('./responseNormalizer');

const prefixMap = require('../config/prefixMap');
const PREFIXES = require('../config/prefixes');

const { buildEM9SkuFromAuthority } = require('../resolvers/marineResolver');

// ============================================================================
// UTILIDADES
// ============================================================================

function normalize(code = '') {
  return String(code).trim().toUpperCase();
}

/**
 * Detecta si el código YA ES un SKU ELIMFILTERS
 * Basado EXCLUSIVAMENTE en prefijos de creación
 */
function isElimfiltersSKU(code) {
  const normalized = normalize(code);
  return Object.values(PREFIXES).some(prefix =>
    normalized.startsWith(prefix)
  );
}

// ============================================================================
// SERVICIO PRINCIPAL
// ============================================================================

async function detectPartNumber(rawCode) {
  const normalizedCode = normalize(rawCode);

  // ------------------------------------------------------------
  // 1. Validación de forma (prefixMap)
  // ------------------------------------------------------------
  const validation = prefixMap.validate(normalizedCode);
  if (!validation.valid) {
    return normalizeResponse({
      status: 'REJECTED',
      source: null,
      normalized_query: normalizedCode,
      reason: 'INVALID_CODE_FORMAT'
    });
  }

  // ------------------------------------------------------------
  // 2. SKU ELIMFILTERS → MongoDB ONLY
  // ------------------------------------------------------------
  if (isElimfiltersSKU(normalizedCode)) {
    const record = await mongoScraper.findBySKU(normalizedCode);

    if (!record) {
      return normalizeResponse({
        status: 'NOT_FOUND',
        source: 'ELIMFILTERS',
        sku: normalizedCode,
        normalized_query: normalizedCode,
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
      normalized_query: normalizedCode
    });
  }

  // ------------------------------------------------------------
  // 3. Autoridad técnica (scraperBridge)
  // ------------------------------------------------------------
  const authorityResult = await scraperBridge(normalizedCode);

  if (!authorityResult || authorityResult.confirmed !== true) {
    return normalizeResponse({
      status: 'NOT_FOUND',
      source: null,
      normalized_query: normalizedCode,
      reason: 'NO_AUTHORITY_CONFIRMED'
    });
  }

  const { source, facts } = authorityResult;

  // ------------------------------------------------------------
  // 4. MARINE → Resolver EM9 (FUERA del bridge)
  // ------------------------------------------------------------
  if (source === 'RACOR' || source === 'SIERRA') {
    const sku = buildEM9SkuFromAuthority({
      source,
      code: facts.code || normalizedCode
    });

    if (!sku) {
      return normalizeResponse({
        status: 'REJECTED',
        source,
        normalized_query: normalizedCode,
        reason: 'EM9_RESOLUTION_FAILED'
      });
    }

    return normalizeResponse({
      status: 'OK',
      source,
      sku,
      family: 'MARINE',
      duty: 'MARINE',
      attributes: facts.attributes || {},
      cross: facts.cross || [],
      applications: facts.applications || [],
      normalized_query: normalizedCode
    });
  }

  // ------------------------------------------------------------
  // 5. OEM / Cross Reference confirmado (NO MARINE)
  // ------------------------------------------------------------
  return normalizeResponse({
    status: 'OK',
    source,
    family: facts.family || null,
    duty: facts.duty || null,
    attributes: facts.attributes || {},
    cross: facts.cross || [],
    applications: facts.applications || [],
    normalized_query: normalizedCode
  });
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  detectPartNumber
};
