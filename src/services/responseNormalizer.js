// ============================================================================
// RESPONSE NORMALIZER — ELIMFILTERS API v5.0.0 (INMUTABLE)
// Contrato único y estable de salida para TODOS los endpoints
//
// Reglas:
//  - No infiere
//  - No valida
//  - No crea datos
//  - No transforma lógica
//  - Solo normaliza la respuesta final
// ============================================================================

function normalizeResponse({
  status = 'UNKNOWN',
  source = null,
  sku = null,
  family = null,
  duty = null,
  attributes = {},
  cross = [],
  applications = [],
  normalized_query = null,
  reason = null
}) {
  return {
    api_version: "5.0.0",
    status,
    source,
    sku,
    family,
    duty,
    attributes,
    cross,
    applications,
    meta: {
      normalized_query,
      reason
    }
  };
}

module.exports = {
  normalizeResponse
};
