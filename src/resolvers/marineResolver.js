// ============================================================================
// MARINE RESOLVER — EM9
// Autoridades: RACOR / SIERRA
// Regla: EM9 + base numérica del código
// ============================================================================

function extractNumericBase(code) {
  const numeric = String(code || '').replace(/\D/g, '');
  return numeric || null;
}

function buildEM9SkuFromAuthority({ source, code }) {
  if (!source || !code) return null;

  const authority = String(source).toUpperCase();
  if (authority !== 'RACOR' && authority !== 'SIERRA') return null;

  const base = extractNumericBase(code);
  if (!base) return null;

  return `EM9${base}`;
}

module.exports = {
  buildEM9SkuFromAuthority
};
