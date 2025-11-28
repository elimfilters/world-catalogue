// /src/utils/normalize.js
module.exports.code = function normalizeCode(raw = "") {
    return raw
        .toString()
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9\-]/g, '')
        .replace(/\s+/g, '');
};

module.exports.oem = function normalizeOEM(raw = "") {
    return raw
        .toString()
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
};
