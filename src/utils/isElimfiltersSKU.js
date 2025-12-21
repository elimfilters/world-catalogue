// ============================================================================
// ELIMFILTERS SKU DETECTOR (INMUTABLE)
// Detecta únicamente SKUs ELIMFILTERS oficiales
// ============================================================================

const PREFIXES = require('../config/prefixes');

const CREATION_PREFIXES = Object.freeze(
  Array.from(new Set(Object.values(PREFIXES)))
);

/**
 * Determina si un código es un SKU ELIMFILTERS válido
 * @param {string} code
 * @returns {boolean}
 */
function isElimfiltersSKU(code = '') {
  const normalized = String(code).trim().toUpperCase();

  return CREATION_PREFIXES.some(prefix =>
    normalized.startsWith(prefix)
  );
}

module.exports = {
  isElimfiltersSKU,
  CREATION_PREFIXES
};
