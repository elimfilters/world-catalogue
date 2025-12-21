// buildMarineSku.js — MARINE ONLY (SIERRA / RACOR)
const { extract4Digits } = require('../utils/digitExtractor');

function buildMarineSku({ code }) {
  const last4 = extract4Digits(code);
  if (!last4) return { error: 'MARINE_LAST4_NOT_FOUND' };
  return `EM9${last4}`;
}

module.exports = { buildMarineSku };
