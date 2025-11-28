// /src/sku/applyPrefix.js
const rules = require("./prefixRules.json");

module.exports.applyPrefix = function applyPrefix(family) {
    if (!family) return null;
    const f = family.toUpperCase();
    return rules.prefixes[f] || null;
};
