// src/services/skuCreationPolicy.js
const crypto = require("crypto");

/**
 * SKU Creation Policy – ELIMFILTERS
 * This module ONLY validates and formats SKUs.
 * It NEVER decides family, duty, digits or sequence.
 */

function createSKU({ familyPrefix, normSequence }) {
  if (!familyPrefix || typeof familyPrefix !== "string") {
    throw new Error("familyPrefix is required");
  }

  if (
    normSequence === undefined ||
    normSequence === null ||
    isNaN(normSequence)
  ) {
    throw new Error("normSequence must be a valid number");
  }

  return `${familyPrefix}-${String(normSequence).padStart(5, "0")}`;
}

/**
 * Hard policy invariant.
 * If it fails → SKU must be rejected upstream.
 */
function enforceSkuPolicyInvariant(payload = {}) {
  const { sku, familyPrefix, normSequence, source } = payload;

  if (!sku || !familyPrefix || normSequence === undefined) {
    return { ok: false, error: "Incomplete SKU payload" };
  }

  const expected = createSKU({ familyPrefix, normSequence });

  if (sku !== expected) {
    return {
      ok: false,
      error: `SKU mismatch. Expected ${expected}, got ${sku}`
    };
  }

  if (!source) {
    return { ok: false, error: "Missing authoritative source" };
  }

  return { ok: true };
}

/**
 * Policy hash for auditing & cache integrity
 */
function policyHash(text = "") {
  return crypto.createHash("sha256").update(text).digest("hex");
}

module.exports = {
  createSKU,
  enforceSkuPolicyInvariant,
  policyHash
};
