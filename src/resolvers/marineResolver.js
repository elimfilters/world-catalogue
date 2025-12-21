// ============================================================================
// MARINE RESOLVER — EM9
// -----------------------------------------------------------------------------
// - Se ejecuta SOLO si la autoridad es MARINE (RACOR / SIERRA)
// - NO scrapea
// - NO infiere
// - Genera SKU EM9 a partir del código confirmado
// ============================================================================

function buildEM9SkuFromAuthority({ source, code }) {
  if (!source || !code) return null;

  const authority = String(source).toUpperCase();

  if (authority !== 'RACOR' && authority !== 'SIERRA') {
    return null;
  }

  // Extrae SOLO la parte numérica (regla oficial)
  const numeric = String(code).replace(/\D/g, '');

  if (!numeric) return null;

  // EM9 + NUMÉRICO COMPLETO
  return `EM9${numeric}`;
}

module.exports = {
  buildEM9SkuFromAuthority
};
