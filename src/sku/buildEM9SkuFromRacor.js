/**
 * ============================================================================
 * EM9 SKU BUILDER — MARINE (RACOR)
 * ----------------------------------------------------------------------------
 * Regla INMUTABLE:
 *  - Entrada: código RACOR original (ej: R45P10, S3165, MOR1005)
 *  - Proceso: extraer SOLO el bloque numérico completo
 *  - Salida: EM9 + bloque numérico (sin guiones, sin letras, sin truncar)
 *
 * Ejemplos:
 *  - R45P10   → EM90910
 *  - S3165    → EM93165
 *  - MOR1005  → EM91005
 * ============================================================================
 */

function buildEM9SkuFromRacor(racorCode) {
  if (!racorCode || typeof racorCode !== 'string') return null;

  const numeric = racorCode.replace(/\D/g, '');
  if (!numeric) return null;

  return `EM9${numeric}`;
}

module.exports = {
  buildEM9SkuFromRacor
};
