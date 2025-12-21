// src/config/prefixMap.js

/**
 * PREFIX MAP — ELIMFILTERS
 * Declarative, closed, auditable.
 * No inference. No fallbacks.
 */

const PREFIX_MAP = {
  // =========================
  // HEAVY DUTY — DONALDSON
  // =========================
  "P55": { brand: "DONALDSON", duty: "HD", family: "OIL" },
  "P56": { brand: "DONALDSON", duty: "HD", family: "FUEL" },
  "P77": { brand: "DONALDSON", duty: "HD", family: "AIR" },
  "P17": { brand: "DONALDSON", duty: "HD", family: "HYDRAULIC" },

  // =========================
  // LIGHT DUTY — FRAM
  // =========================
  "PH":  { brand: "FRAM", duty: "LD", family: "OIL" },
  "CA":  { brand: "FRAM", duty: "LD", family: "AIR" },
  "CH":  { brand: "FRAM", duty: "LD", family: "CABIN" },
  "G":   { brand: "FRAM", duty: "LD", family: "FUEL" }
};

/**
 * Resolves ONLY by explicit prefix.
 * @returns { brand, duty, family } | null
 */
function resolveBrandFamilyDutyByPrefix(code = "") {
  const normalized = String(code).toUpperCase().trim();

  for (const prefix of Object.keys(PREFIX_MAP)) {
    if (normalized.startsWith(prefix)) {
      return PREFIX_MAP[prefix];
    }
  }

  return null;
}

module.exports = {
  PREFIX_MAP,
  resolveBrandFamilyDutyByPrefix
};
