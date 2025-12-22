// ============================================================================
// RESPONSE NORMALIZER — ELIMFILTERS API (v5.0.0)
// - Estructura ÚNICA de respuesta
// - No decide lógica
// - No infiere datos
// - Solo normaliza la salida del sistema
// ============================================================================

function normalizeResponse({
  status,
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
    api_version: '5.0.0',
    status,                 // OK | NOT_FOUND | REJECTED
    source,                 // ELIMFILTERS | DONALDSON | FRAM | RACOR | SIERRA | null
    sku,                    // SKU ELIMFILTERS si aplica
    family,                 // OIL | FUEL | AIR | MARINE | etc
    duty,                   // LD | HD | MARINE
    attributes,             // Datos técnicos
    cross,                  // Cross references confirmados
    applications,           // Aplicaciones confirmadas
    meta: {
      normalized_query,     // Código normalizado de entrada
      reason                // Motivo en NOT_FOUND / REJECTED
    }
  };
}

module.exports = {
  normalizeResponse
};
