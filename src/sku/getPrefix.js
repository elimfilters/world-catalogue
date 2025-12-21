/**
 * =============================================================================
 * ELIMFILTERS — PREFIX RESOLVER (SKU CREATION)
 * -----------------------------------------------------------------------------
 * Usa EXCLUSIVAMENTE prefijos oficiales de creación de SKU.
 * No infiere, no inventa, no hace fallback.
 * =============================================================================
 */

const PREFIXES = require("../config/prefixes");

// -----------------------------------------------------------------------------
// Normalización
// -----------------------------------------------------------------------------
function clean(text) {
  return String(text || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

// -----------------------------------------------------------------------------
// SINÓNIMOS OFICIALES DE FAMILIA (CORPORATIVOS)
// -----------------------------------------------------------------------------
const FAMILY_SYNONYMS = Object.freeze({
  // OIL
  OIL: "OIL",
  LUBE: "OIL",
  ENGINE_OIL: "OIL",

  // FUEL
  FUEL: "FUEL",
  DIESEL: "FUEL",

  // AIR
  AIR: "AIR",
  AIR_FILTER: "AIR",

  // CABIN
  CABIN: "CABIN",
  HVAC: "CABIN",

  // HYDRAULIC
  HYDRAULIC: "HYDRAULIC",

  // COOLANT
  COOLANT: "COOLANT",

  // SEPARATOR
  SEPARATOR: "SEPARATOR",
  FUEL_WATER: "SEPARATOR",

  // TURBINE
  TURBINE: "TURBINE",

  // HOUSING (carcasas de aire)
  HOUSING: "HOUSING",
  AIR_HOUSING: "HOUSING",

  // KIT
  KIT: "KIT",
  SERVICE_KIT: "KIT",
  MAINTENANCE_KIT: "KIT",

  // MARINE
  MARINE: "MARINE",
  BOAT: "MARINE"
});

// -----------------------------------------------------------------------------
// Normaliza familia
// -----------------------------------------------------------------------------
function normalizeFamily(family) {
  const key = clean(family);
  return FAMILY_SYNONYMS[key] || null;
}

// -----------------------------------------------------------------------------
// MAPA FINAL family | duty → PREFIJO SKU (INMUTABLE)
// -----------------------------------------------------------------------------
function getPrefix(family, duty) {
  const fam = normalizeFamily(family);
  const dt = String(duty || "").toUpperCase();

  if (!fam || !dt) {
    return null;
  }

  const KEY = `${fam}|${dt}`;

  const MAP = {
    // =========================
    // CATÁLOGO GENERAL
    // =========================
    "OIL|LD": PREFIXES.OIL_LD,
    "OIL|HD": PREFIXES.OIL_HD,

    "FUEL|LD": PREFIXES.FUEL_LD,
    "FUEL|HD": PREFIXES.FUEL_HD,

    "AIR|LD": PREFIXES.AIR_LD,
    "AIR|HD": PREFIXES.AIR_HD,

    "CABIN|LD": PREFIXES.CABIN_LD,
    "CABIN|HD": PREFIXES.CABIN_HD,

    // =========================
    // SOLO HD
    // =========================
    "HYDRAULIC|HD": PREFIXES.HYDRAULIC_HD,
    "COOLANT|HD": PREFIXES.COOLANT_HD,
    "SEPARATOR|HD": PREFIXES.SEPARATOR_HD,
    "TURBINE|HD": PREFIXES.TURBINE_HD,

    // =========================
    // CARCASAS (NO LD)
    // =========================
    "HOUSING|HD": PREFIXES.EA2,

    // =========================
    // KITS
    // =========================
    "KIT|LD": PREFIXES.EK3,
    "KIT|HD": PREFIXES.EK5,

    // =========================
    // MARINE
    // =========================
    "MARINE|LD": PREFIXES.MARINE_ANY,
    "MARINE|HD": PREFIXES.MARINE_ANY
  };

  return MAP[KEY] || null;
}

module.exports = {
  getPrefix,
  normalizeFamily
};
