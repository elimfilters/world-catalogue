const { snapshot } = require('./metricsMarine');

function checkMarineAlerts() {
  const s = snapshot();
  const alerts = [];

  if (s.avgLatency > 1500) {
    alerts.push({ type: 'LATENCY_HIGH_MARINE', value: s.avgLatency });
  }

  const rejectRate = s.requests ? s.rejected / s.requests : 0;
  if (rejectRate > 0.05) {
    alerts.push({ type: 'REJECT_RATE_HIGH_MARINE', value: rejectRate });
  }

  return alerts;
}

module.exports = { checkMarineAlerts };
