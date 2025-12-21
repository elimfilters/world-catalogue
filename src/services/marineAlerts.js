// src/services/marineAlerts.js
const { snapshot } = require('../metrics/marineMetrics');

const THRESHOLDS = Object.freeze({
  REJECT_RATE: 0.10,      // 10%
  MAX_AVG_LATENCY: 1200  // ms
});

function evaluateMarineAlerts() {
  const s = snapshot();

  if (!s.requests) return { ok: true, alerts: [] };

  const alerts = [];

  const rejectRate = s.rejected / s.requests;
  if (rejectRate >= THRESHOLDS.REJECT_RATE) {
    alerts.push({
      type: 'REJECT_RATE_HIGH',
      value: rejectRate,
      message: `Reject rate ${(rejectRate * 100).toFixed(1)}%`
    });
  }

  if (s.avgLatency >= THRESHOLDS.MAX_AVG_LATENCY) {
    alerts.push({
      type: 'LATENCY_HIGH',
      value: s.avgLatency,
      message: `Avg latency ${s.avgLatency} ms`
    });
  }

  const allowedSources = ['RACOR', 'SIERRA'];
  Object.keys(s.bySource || {}).forEach(src => {
    if (!allowedSources.includes(src) && s.bySource[src] > 0) {
      alerts.push({
        type: 'UNEXPECTED_SOURCE',
        value: src,
        message: `Unexpected source ${src}`
      });
    }
  });

  return {
    ok: alerts.length === 0,
    alerts,
    meta: {
      requests: s.requests,
      ok: s.ok,
      rejected: s.rejected,
      avgLatency: s.avgLatency
    }
  };
}

module.exports = { evaluateMarineAlerts };
