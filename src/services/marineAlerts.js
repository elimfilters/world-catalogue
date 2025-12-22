const { snapshot } = require('./marineMetrics');

function checkMarineAlerts() {
  const s = snapshot();
  const alerts = [];

  const rejectRate = s.requests ? (s.rejected / s.requests) * 100 : 0;
  if (rejectRate > 5) alerts.push('HIGH_REJECT_RATE');

  if (s.avgLatency > 1500) alerts.push('HIGH_LATENCY');

  if (s.bySource.RACOR + s.bySource.SIERRA > 0 && s.bySource.SIERRA === 0) {
    alerts.push('SIERRA_SILENT');
  }

  return alerts;
}

module.exports = { checkMarineAlerts };
