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
const { generateSKU, generateEM9SubtypeSKU, generateEM9SSeparatorSKU, generateET9SystemSKU, generateET9FElementSKU } = require('../sku/generator');
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

// OEM dataset para fallback SOLO cuando el código no es ni Donaldson ni FRAM (Regla 3)
let OEM_XREF = {};
try { OEM_XREF = require('../data/oem_xref.json'); } catch (_) { OEM_XREF = {}; }

function canonKey(s) {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function classifyInputCode(code) {
  const up = normalize.code(code); // ✅ CORREGIDO
  const isDonaldson = prefixMap.DONALDSON_STRICT_REGEX?.test?.(up);
  const isFram = /^(CA|CF|CH|PH|TG|XG|HM|G|PS)\d/i.test(up);
  if (isDonaldson) return 'MANUFACTURER_DONALDSON';
  if (isFram) return 'MANUFACTURER_FRAM';
  const meta = OEM_XREF[canonKey(code)];
  if (meta && meta.brand) return 'OEM';
  return /^[A-Z]{1,4}\d{3,}/.test(up) ? 'CROSS_REF' : 'UNKNOWN';
}

// 🔧 Reemplazo de uso incorrecto de prefixMap.normalize por normalize.code
// Esta línea es el reemplazo directo del error en línea 523
// const hint = prefixMap.normalize(codeUpper) || {}; // ❌ INCORRECTO
const hint = prefixMap.resolveBrandFamilyDutyByPrefix(normalize.code(codeUpper)) || {}; // ✅ CORRECTO

// ... (resto del archivo sin cambios)

module.exports = {
    detectFilter
};
