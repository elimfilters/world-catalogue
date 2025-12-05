const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const prefixMap = require('../config/prefixMap');
const { skuPolicyConfig } = require('../config/skuPolicyConfig');
const { scraperBridge } = require('../scrapers/scraperBridge');
// Consolidated generator imports
const { extract4Digits } = require('../utils/digitExtractor');
const { upsertBySku } = require('./syncSheetsService');
const generator = require('../sku/generator');
const { getPrefix, generateEM9SubtypeSKU, generateEM9SSeparatorSKU, generateET9SystemSKU, generateET9FElementSKU } = generator;
const { resolveFamilyDutyByOEMPrefix } = require('../config/oemPrefixRules');

function readPolicyText() {
  const p = path.join(__dirname, '..', '..', 'docs', 'SKU_CREATION_POLICY_ES.md');
  return fs.readFileSync(p, 'utf8');
}

function policyHash() {
  const txt = readPolicyText();
  return crypto.createHash('sha256').update(txt).digest('hex');
}

async function applySkuPolicyAndUpsert(inputCode, lang = 'es') {
  const raw = String(inputCode || '');
  const normalized = prefixMap.normalize(raw);
  const hint = prefixMap.resolveBrandFamilyDutyByPrefix(normalized) || {};

  const bridged = await scraperBridge(normalized, hint.duty || null);

  if (bridged && bridged.valid) {
    const family = bridged.family || hint.family || null;
    const duty = bridged.duty || hint.duty || null;
    const last4 = bridged.last4 || extract4Digits(bridged.code);
    const sku = generator.generateSKU(family, duty, last4, { rawCode: raw });
    if (typeof sku === 'string') {
      const data = {
        query_normalized: normalized,
        sku,
        family,
        duty,
        cross_reference: bridged.cross || [],
        applications: bridged.applications || [],
        attributes: bridged.attributes || {},
        source: bridged.source || (hint.brand || ''),
        code_oem: Array.isArray((bridged.attributes || {}).oem_numbers) ? (bridged.attributes.oem_numbers.join(', ')) : '',
        homologated_code: bridged.code || '',
        donaldson_code: (String(bridged.source || '').toUpperCase() === 'DONALDSON') ? (bridged.code || '') : '',
        fram_code: (String(bridged.source || '').toUpperCase() === 'FRAM') ? (bridged.code || '') : ''
      };
      await upsertBySku(data);
      return { ok: true, policy: 'scraper', code: normalized, sku, family, duty };
    }
  }

  const fam = hint.family || null;
  const dut = hint.duty || null;
  const last4 = extract4Digits(normalized);
  const sku = generator.generateSKU(fam, dut, last4, { rawCode: raw });
  if (typeof sku === 'string') {
    const data = {
      query_normalized: normalized,
      sku,
      family: fam,
      duty: dut,
      cross_reference: [],
      applications: [],
      attributes: {},
      source: 'OEM',
      code_oem: normalized
    };
    await upsertBySku(data);
    return { ok: true, policy: 'oem_fallback', code: normalized, sku, family: fam, duty: dut };
  }

  return { ok: false, error: 'No se pudo generar SKU con la política vigente.' };
}

module.exports = {
  readPolicyText,
  policyHash,
  applySkuPolicyAndUpsert,
  enforceSkuPolicyInvariant,
  getPolicyConfig: () => ({ ...skuPolicyConfig, policy_hash: policyHash() })
};

/**
 * Enforce the inviolable SKU creation policy against a payload/result.
 * Returns { ok: true } if compliant, otherwise { ok: false, error }.
 */
function enforceSkuPolicyInvariant(payload = {}) {
  try {
    // Allow disabling hard enforcement via config (defaults to true). Useful for diagnostics.
    if (!skuPolicyConfig.enforceInviolable) {
      return { ok: true };
    }
    const sku = String(payload.sku || '');
    const family = String(payload.family || '').toUpperCase();
    const duty = String(payload.duty || '').toUpperCase();
    const source = String(payload.source || '').toUpperCase();
    const oemCode = String(payload.code_oem || payload.oem_equivalent || payload.code_input || payload.query_normalized || payload.query || '');
    // Prefer homologated brand code for last4 when source is DONALDSON/FRAM
    const homologatedCode = String(
      (source === 'DONALDSON' && (payload.donaldson_code || payload.homologated_code)) ||
      (source === 'FRAM' && (payload.fram_code || payload.homologated_code)) ||
      ''
    );
    const codeForDigits = source === 'DONALDSON' || source === 'FRAM' ? homologatedCode : oemCode;

    // Allow EM9/ET9 specialized families by their dedicated generators
    if (/^(EM9|ET9)/.test(sku)) {
      return { ok: true };
    }

    // Compute expected SKU strictly from decision table and last4 digits
    const last4 = extract4Digits(codeForDigits);
    if ((source === 'DONALDSON' || source === 'FRAM') && !last4) {
      return { ok: false, error: 'Missing homologated code digits for SKU generation (policy).' };
    }
    const expected = generator.generateSKU(family, duty, last4);
    if (typeof expected !== 'string') {
      return { ok: false, error: 'Missing family/duty/last4 for SKU generation (policy).' };
    }
    if (expected !== sku) {
      return { ok: false, error: `SKU mismatch with policy decision table: expected ${expected}, got ${sku}` };
    }

    // Homologation rule: HD → DONALDSON, LD → FRAM; exceptions via OEM/marine
    const isMarine = family === 'MARINE' || family === 'TURBINE SERIES';
    const homologOk = (
      (duty === 'HD' && source === 'DONALDSON') ||
      (duty === 'LD' && source === 'FRAM') ||
      isMarine
    );
    if (!homologOk) {
      // If not homologated to DONALDSON/FRAM, enforce OEM prefix family/duty inference
      const oemHint = resolveFamilyDutyByOEMPrefix(codeForDigits, duty);
      const famHint = String(oemHint?.family || '').toUpperCase();
      const dutHint = String(oemHint?.duty || '').toUpperCase();
      if (!famHint) {
        return { ok: false, error: 'OEM fallback used without resolvable family by prefix (policy).' };
      }
      if (famHint !== family) {
        return { ok: false, error: `Family mismatch under OEM fallback: expected ${famHint}, got ${family}` };
      }
      if (dutHint && duty && dutHint !== duty) {
        return { ok: false, error: `Duty mismatch under OEM fallback: expected ${dutHint}, got ${duty}` };
      }
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: `Policy enforcement error: ${e.message}` };
  }
}