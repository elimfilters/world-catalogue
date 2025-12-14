// ============================================================================
// DETECTION SERVICE FINAL - v5.3.3 CLEAN
// ============================================================================

const normalize = require('../utils/normalize');
const { scraperBridge } = require('../scrapers/scraperBridge');
const { detectDuty } = require('../utils/dutyDetector');
const { detectFamilyHD, detectFamilyLD } = require('../utils/familyDetector');
const { generateSKU } = require('../sku/generator');
const { extract4Digits, extract4Alnum } = require('../utils/digitExtractor');
const { noEquivalentFound } = require('../utils/messages');
const { saveToCache } = require('./mongoService');

async function detectFilter(code, opts = {}) {
  const codeNorm = normalize.code(code);
  const raw = await scraperBridge(codeNorm, opts);
  if (!raw) throw noEquivalentFound(codeNorm);
  const duty = detectDuty(raw);
  const family = duty === 'HD' ? detectFamilyHD(raw) : detectFamilyLD(raw);
  if (!duty || !family) throw new Error('Unable to determine duty or family');
  const digits = extract4Digits(codeNorm) || extract4Alnum(codeNorm) || '0000';
  const sku = generateSKU(family, duty, digits);
  const result = { sku, family, duty, source: duty === 'LD' ? 'FRAM' : 'DONALDSON', original_code: code };
  await saveToCache(result);
  return result;
}

module.exports = { detectFilter };
