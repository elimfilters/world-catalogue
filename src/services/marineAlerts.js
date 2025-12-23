// ============================================================================
// MARINE ALERTS — SAFE MODE (DISABLED BY DEFAULT)
// - Nunca rompe el servidor
// - Nunca asume arrays
// - Solo se activa si ENABLE_MARINE_ALERTS=true
// ============================================================================

const ENABLED = process.env.ENABLE_MARINE_ALERTS === 'true';

/**
 * Check MARINE alerts (SAFE)
 * @param {Object} payload
 */
function checkMarineAlerts(payload) {
  if (!ENABLED) {
    return;
  }

  if (!payload || typeof payload !== 'object') {
    return;
  }

  const applications = Array.isArray(payload.applications)
    ? payload.applications
    : [];

  const cross = Array.isArray(payload.cross)
    ? payload.cross
    : [];

  // ⚠️ A partir de aquí TODO es seguro
  if (applications.length === 0 && cross.length === 0) {
    console.warn('[MARINE ALERT] No applications or cross references');
  }
}

module.exports = {
  checkMarineAlerts
};
