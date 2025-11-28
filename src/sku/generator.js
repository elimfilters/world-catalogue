// /src/sku/generator.js

const { extractLast4 } = require("../utils/digitExtractor");
const { applyPrefix } = require("./applyPrefix");

function generateSKU(family, oemCode) {
    if (!family || !oemCode) return null;

    // 1. Prefijo oficial ELIMFILTERS
    const prefix = applyPrefix(family);
    if (!prefix) return null;

    // 2. Extraer últimos 4 dígitos reales (regla inviolable)
    const last4 = extractLast4(oemCode);
    if (!last4) return null;

    // 3. SKU final
    return `${prefix}${last4}`;
}

module.exports = { generateSKU };
