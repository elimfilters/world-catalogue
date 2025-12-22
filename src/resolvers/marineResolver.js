// ============================================================================
// MARINE RESOLVER — EM9
// ============================================================================

function buildEM9SkuFromAuthority({ source, code }) {
  if (!code) return null;

  // RACOR / SIERRA → extraer base numérica
  const numeric = String(code).replace(/\D/g, '');

  if (!numeric || numeric.length < 3) return null;

  return `EM9${numeric}`;
}

module.exports = {
  buildEM9SkuFromAuthority
};
