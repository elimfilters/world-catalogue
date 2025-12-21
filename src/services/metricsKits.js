const counters = { requests:0, ok:0, rejected:0, byDuty:{LD:0,HD:0} };

function markReq(duty){ counters.requests++; if(counters.byDuty[duty]!==undefined) counters.byDuty[duty]++; }
function markOk(){ counters.ok++; }
function markRej(){ counters.rejected++; }
function snapshot(){ return { ...counters }; }

module.exports = { markReq, markOk, markRej, snapshot };
