/**
 * ================================================================
 * FAMILY NORMALIZER — OFFICIAL & IMMUTABLE LOGIC
 * ------------------------------------------------
 * WARNING: This module NEVER generates ELIMFILTERS prefixes.
 * It ONLY normalizes text into a corporate family bucket.
 *
 * Prefix generation is handled ONLY by:
 *   /src/config/prefixes.js
 *   /src/sku/generator.js
 *
 * ================================================================
 */

function normalize(text) {
  return String(text || "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------
// FAMILY DEFINITIONS (inmutables)
// ---------------------------------------------------------------

const FAMILY_MAP = Object.freeze({

  // -----------------------------
  // AIRE
  // -----------------------------
  AIRE: [
    "AIR",
    "AIR FILTER",
    "PRIMARY AIR",
    "SECONDARY AIR",
    "OUTER AIR",
    "INNER AIR",
    "AIR ELEMENT",
    "RESPIRATOR",
    "INTAKE FILTER",
    "PANEL FILTER",
    "CABIN AIR" // handled separately below
  ],

  // -----------------------------
  // CABIN
  // -----------------------------
  CABIN: [
    "CABIN",
    "CABIN FILTER",
    "HVAC",
    "AC FILTER",
    "A/C FILTER",
    "POLLEN FILTER",
    "INTERIOR FILTER"
  ],

  // -----------------------------
  // OIL
  // -----------------------------
  OIL: [
    "OIL",
    "OIL FILTER",
    "LUBE",
    "LUBE FILTER",
    "LUBRICACION",
    "SPIN ON",
    "SPIN-ON",
    "CARTRIDGE",
    "OIL CARTRIDGE"
  ],

  // -----------------------------
  // FUEL (NO incluye separadores)
  // -----------------------------
  FUEL: [
    "FUEL",
    "FUEL FILTER",
    "GAS FILTER",
    "DIESEL FILTER",
    "PRIMARY FUEL",
    "SECONDARY FUEL",
    "INJECTION FILTER"
  ],

  // -----------------------------
  // SEPARATOR (ES9 – Heavy Duty)
  // -----------------------------
  SEPARATOR: [
    "SEPARATOR",
    "FUEL WATER SEPARATOR",
    "WATER SEPARATOR",
    "S3201",
    "R12T",
    "R15T",
    "R20T",
    "R25T",
    "R90T",
    "TURBINE",  // HD turbine elements
    "TURBINE ELEMENT"
  ],

  // -----------------------------
  // HYDRAULIC (EH6)
  // -----------------------------
  HYDRAULIC: [
    "HYDRAULIC",
    "HYDRAULIC FILTER",
    "HF",
    "RETURN FILTER",
    "SUCTION FILTER",
    "PRESSURE FILTER"
  ],

  // -----------------------------
  // COOLANT (EW7)
  // -----------------------------
  COOLANT: [
    "COOLANT",
    "COOLANT FILTER",
    "WF2071",
    "WF2054",
    "WF"
  ],

  // -----------------------------
  // HOUSING (EA2)
  // -----------------------------
  HOUSING: [
    "HOUSING",
    "AIR HOUSING",
    "HOUSING AIR",
    "CANISTER",
    "AIR CLEANER BODY"
  ],

  // -----------------------------
  // MARINE (EM9)
  // -----------------------------
  MARINE: [
    "MARINE",
    "BOAT",
    "MERCRUISER",
    "SIERRA",
    "PARSONS",
    "YANMAR",
    "MARINE FUEL",
    "MARINE OIL",
    "MARINE TURBINE"
  ],

  // -----------------------------
  // KITS (EK3 / EK5)
  // -----------------------------
  KIT: [
    "KIT",
    "SERVICE KIT",
    "FILTER KIT",
    "MAINTENANCE KIT",
    "PM KIT",
    "OEM KIT"
  ]
});

// ---------------------------------------------------------------
// MAIN NORMALIZATION FUNCTION
// ---------------------------------------------------------------

function detectFamily(raw) {
  const t = normalize(raw);

  for (const [family, words] of Object.entries(FAMILY_MAP)) {
    for (const w of words) {
      if (t.includes(w)) return family;
    }
  }

  return null;
}

module.exports = {
  detectFamily
};