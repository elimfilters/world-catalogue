// ============================================================================
// SIERRA ↔ RACOR EQUIVALENCE MAP (INMUTABLE)
// Fuente: equivalencias confirmadas (NO inferencias)
// Uso: resolver SIERRA → RACOR antes de generar EM9
// ============================================================================

const SIERRA_RACOR_MAP = Object.freeze({
  // -------------------------------
  // FUEL — Spin-On / Water Separator
  // -------------------------------
  // Ejemplos confirmados
  "18-7844": "R45P10",
  "18-7845": "R45S10",
  "18-7946": "S3130",

  // -------------------------------
  // OIL — Marine
  // -------------------------------
  "18-7722": "MOL1005",

  // -------------------------------
  // WATER DRAIN / ACCESSORIES
  // -------------------------------
  "23-7720": "WD100"
});

/**
 * Resolve SIERRA code to RACOR equivalent (EXACT only)
 * @param {string} sierraCode
 * @returns {{ racorCode: string, confidence: 'EXACT' } | null}
 */
function resolveSierraToRacor(sierraCode) {
  const key = String(sierraCode || "").trim();
  const racorCode = SIERRA_RACOR_MAP[key];
  if (!racorCode) return null;
  return { racorCode, confidence: 'EXACT' };
}

module.exports = {
  resolveSierraToRacor,
  SIERRA_RACOR_MAP
};
