// ========================================================
// GENERADOR OFICIAL DE SKUS ELIMFILTERS™
// ========================================================

const prefixRules = require("./prefixRules.json").rules;
const familyMap = require("./familyMap.json");
const { extract4 } = require("../utils/extractDigits");

function normalizeFamily(famRaw) {
    if (!famRaw) return null;

    const f = famRaw.toUpperCase().trim();

    return familyMap[f] || null;
}

function getPrefix(family) {
    return prefixRules[family] || null;
}

/**
 * GENERAR EL SKU OFICIAL
 * family = "OIL" | "AIRE" | "FUEL" | "CABIN" ...
 * duty   = "HD" | "LD"
 * oem    = código del scraper
 */
function generateSKU(familyRaw, duty, oemCode) {
    const family = normalizeFamily(familyRaw);

    if (!family) return null;

    // Obtener prefijo correcto
    const prefix = getPrefix(family);
    if (!prefix) return null;

    // Regla inviolable de 4 dígitos
    const last4 = extract4(oemCode);
    if (!last4) return null;

    // SKU final
    return `${prefix}${last4}`;
}

module.exports = {
    generateSKU
};
