// ============================================================================
//  ELIMFILTERS SKU DETECTOR (INMUTABLE)
//  Rol: detectar SI un código pertenece a ELIMFILTERS
//  - SOLO usa prefijos oficiales de creación de SKU
//  - NO regex OEM
//  - NO heurísticas
//  - NO lógica comercial
// ============================================================================

const PREFIXES = require('../config/prefixes');

// ---------------------------------------------------------------------------
// Prefijos oficiales de CREACIÓN (fuente única)
// ---------------------------------------------------------------------------
const ELIMFILTERS_PREFIXES = Object.freeze(
  Object.values(PREFIXES)
);

// ---------------------------------------------------------------------------
// Detector
// ---------------------------------------------------------------------------
function isElimfiltersSKU(code) {
  if (!code) return false;

  const normalized = String(code).trim().toUpperCase();

  return ELIMFILTERS_PREFIXES.some(prefix =>
    normalized.startsWith(prefix)
  );
}

module.exports = {
  isElimfiltersSKU
};
