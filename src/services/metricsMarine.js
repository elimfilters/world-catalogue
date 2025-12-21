const counters = {
  requests: 0,
  ok: 0,
  rejected: 0,
  bySource: { RACOR: 0, SIERRA: 0 },
  byFamily: { FUEL: 0, OIL: 0, AIR: 0 },
  latencyMs: []
};

function markRequest() { counters.requests++; }
function markOk(source, family, ms) {
  counters.ok++;
  if (counters.bySource[source] !== undefined) counters.bySource[source]++;
  if (counters.byFamily[family] !== undefined) counters.byFamily[family]++;
  counters.latencyMs.push(ms);
}
function markRejected() { counters.rejected++; }

function snapshot() {
  const avgLatency =
    counters.latencyMs.length
      ? Math.round(counters.latencyMs.reduce((a,b)=>a+b,0)/counters.latencyMs.length)
      : 0;
  return { ...counters, avgLatency };
}

module.exports = { markRequest, markOk, markRejected, snapshot };
