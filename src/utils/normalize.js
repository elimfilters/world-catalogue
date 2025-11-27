// ===========================================
// NORMALIZACIÓN GLOBAL ELIMFILTERS
// ===========================================

function normalizeCode(raw) {
    if (!raw || typeof raw !== "string") return "";

    return raw
        .trim()
        .toUpperCase()
        .replace(/[\s\-_/]/g, "");     // quitar espacios, guiones, slash
}

module.exports = {
    code: normalizeCode
};
