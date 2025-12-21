const { extract4Digits } = require('../utils/digitExtractor');

function buildEM9({ code }) {
  const last4 = extract4Digits(code);
  if (!last4) return null;
  return `EM9${last4}`; // SIN guiones
}

function normalizeMarineEquivalence({ authority, code, family }) {
  // family se conserva como metadata (FUEL/OIL/AIR/SEPARATOR)
  const sku = buildEM9({ code });
  if (!sku) return null;
  return {
    sku,
    authority,
    family,
    source_code: code
  };
}

module.exports = { normalizeMarineEquivalence };
