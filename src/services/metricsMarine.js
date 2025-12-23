// ============================================================================
// MARINE METRICS + ALERTS — HARDENED (NO CRASH)
// ============================================================================

const express = require('express');
const router = express.Router();

const ENABLE_ALERTS = process.env.ENABLE_MARINE_ALERTS === 'true';

// Estado interno seguro
const state = {
  total: 0,
  ok: 0,
  rejected: 0
};

// ---------------------------------------------------------------------------
// MÉTRICAS (READ ONLY)
// ---------------------------------------------------------------------------
router.get('/', (_req, res) => {
  return res.json({
    marine: {
      enabled: true,
      alerts_enabled: ENABLE_ALERTS,
      counters: state
    }
  });
});

// ---------------------------------------------------------------------------
// ALERTS — SAFE MODE
// ---------------------------------------------------------------------------
function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function checkMarineAlerts(payload) {
  if (!ENABLE_ALERTS) return;
  if (!payload || typeof payload !== 'object') return;

  const applications = safeArray(payload.applications);
  const cross = safeArray(payload.cross);

  if (applications.length === 0 && cross.length === 0) {
    console.warn('[MARINE ALERT] Empty applications and cross references');
  }
}

// ---------------------------------------------------------------------------
// EXPORTS (IMPORTANTE)
// ---------------------------------------------------------------------------
module.exports = router;
module.exports.checkMarineAlerts = checkMarineAlerts;
