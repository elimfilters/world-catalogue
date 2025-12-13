// ============================================================================
// DETECTION SERVICE FINAL - v5.3.0 CORRECTED
// ARQUITECTURA:
// - LD: FRAM es fuente completa (SKU + Specs + Apps + Cross-Ref)
// - HD: Donaldson para SKU, Fleetguard para todo lo demás
// ============================================================================

const normalize = require('../utils/normalize');
const { scraperBridge } = require('../scrapers/scraperBridge');
const prefixMap = require('../config/prefixMap');
const { detectDuty } = require('../utils/dutyDetector');
const { detectFamilyHD, detectFamilyLD } = require('../utils/familyDetector');
const { generateSKU } = require('../sku/generator');
const { extract4Digits, extract4Alnum } = require('../utils/digitExtractor');
const { getMedia } = require('../utils/mediaMapper');
const { noEquivalentFound } = require('../utils/messages');
const { searchInSheet, upsertBySku } = require('./syncSheetsService');
const { resolveAToD } = require('../utils/aToDResolver');
const { enforceSkuPolicyInvariant } = require('./skuCreationPolicy');
const { enrichHDWithFleetguard, enrichWithFleetguardAny } = require('./fleetguardEnrichmentService');
const { saveToCache } = require('./mongoService');
const { upsertMarinosBySku } = require('./marineImportService');
const { skuPolicyConfig } = require('../config/skuPolicyConfig');
const { extractFramSpecs, extractDonaldsonSpecs, getDefaultSpecs } = require('../services/technicalSpecsScraper');
const { filterRelevantFields, validateRequiredFields } = require('../utils/filterTypeFieldMapping');

let OEM_XREF = {};
try { OEM_XREF = require('../data/oem_xref.json'); } catch (_) { OEM_XREF = {}; }

function canonKey(s) {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function classifyInputCode(code) {
  const up = normalize.code(code);
  const isDonaldson = prefixMap.DONALDSON_STRICT_REGEX?.test?.(up);
  const isFram = /^(CA|CF|CH|PH|TG|XG|HM|G|PS)\d/i.test(up);
  if (isDonaldson) return 'MANUFACTURER_DONALDSON';
  if (isFram) return 'MANUFACTURER_FRAM';
  const meta = OEM_XREF[canonKey(code)];
  if (meta && meta.brand) return 'OEM';
  return /^[A-Z]{1,4}\d{3,}/.test(up) ? 'CROSS_REF' : 'UNKNOWN';
}

async function detectFilter(code, opts = {}) {
  const codeNorm = normalize.code(code);
  const codeUpper = codeNorm.toUpperCase();
  const hint = prefixMap.resolveBrandFamilyDutyByPrefix(codeNorm) || {};

  const sourceType = classifyInputCode(codeNorm);
  const raw = await scraperBridge(codeNorm, { ...opts, sourceType });
  if (!raw) throw noEquivalentFound(codeNorm);

  const duty = hint.duty || detectDuty(raw);
  const family = hint.family || (duty === 'HD' ? detectFamilyHD(raw) : detectFamilyLD(raw));
  const media = getMedia(family, raw);
  const subtype = raw.Subtype || '';
  const SKU = generateSKU(codeNorm, family);

  const enriched = duty === 'HD'
    ? await enrichHDWithFleetguard(raw, codeNorm)
    : raw;

  const final = {
    query_norm: codeNorm,
    SKU,
    ...enriched,
    FilterType: family,
    MediaType: media,
    Subtype: subtype,
    Duty: duty,
    created_at: new Date().toISOString(),
    ok: true
  };

  await saveToCache(final);
  return final;
}

module.exports = {
  detectFilter
};
