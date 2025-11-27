// =====================================
// LOGGER SIMPLE — PRODUCCIÓN
// =====================================

function log(...msg) {
    console.log("[EF]", ...msg);
}

function warn(...msg) {
    console.warn("[EF-WARN]", ...msg);
}

function error(...msg) {
    console.error("[EF-ERR]", ...msg);
}

module.exports = { log, warn, error };
