// ============================================================================
// MARINE ALERTS — HARDENING
// ============================================================================
function alert(type, payload = {}) {
  console.error(`🚨 [MARINE ALERT] ${type}`, {
    ...payload,
    timestamp: new Date().toISOString()
  });
}
module.exports = { alert };
