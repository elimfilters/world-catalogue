/**
 * =============================================================================
 * ELIMFILTERS — PREFIX RESOLVER (INMUTABLE)
 * -----------------------------------------------------------------------------
 * ADVERTENCIA:
 * Este archivo NO genera prefijos ELIMFILTERS.
 *
 * Los prefijos oficiales provienen EXCLUSIVAMENTE de:
 *   /src/config/prefixes.js
 *
 * Este archivo únicamente:
 *   1. Normaliza sinónimos de family (AIR, FUEL, OIL, CABIN, MARINE, etc)
 *   2. Empareja family + duty (LD/HD) → prefijo oficial
 *
 * NUNCA debe deducir prefijos a partir de códigos OEM.
 * NUNCA debe generar EL8 / EA1 / EF9 / EC1 / EK3 / EK5 / EM9 / ET9.
 * =============================================================================
 */

const PREFIXES = require("../config/prefixes");

// Normaliza texto
function clean(text) {
  return String(text || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

/**
 * =============================================================================
 * SINÓNIMOS OFICIALES DE FAMILIAS
 * -----------------------------------------------------------------------------
 * Todos mapean a una de las familias corporativas:
 *  - OIL
 *  - FUEL
 *  - AIR
 *  - CABIN
 *  - HYDRAULIC
 *  - COOLANT
 *  - TURBINE
 *  - HOUSING
 *  - MARINE
 * =============================================================================
 */

const FAMILY_SYNONYMS = Object.freeze({
  // ---------------------
  // OIL FILTER
  // ---------------------
  OIL: "OIL",
  ENGINE_OIL: "OIL",
  LUBE: "OIL",
  LUBE_FILTER: "OIL",
  FULL_FLOW: "OIL",
  PRIMARY_OIL: "OIL",
  SECONDARY_OIL: "OIL",

  // ---------------------
  // FUEL FILTER
  // ---------------------
  FUEL: "FUEL",
  DIESEL: "FUEL",
  FUEL_FILTER: "FUEL",
  PRIMARY_FUEL: "FUEL",
  SECONDARY_FUEL: "FUEL",
  FUEL_WATER_SEPARATOR: "SEPARATOR",
  WATER_SEPARATOR: "SEPARATOR",
  SEPARATOR: "SEPARATOR",

  // ---------------------
  // AIR FILTER (AIR)
  // ---------------------
  AIR: "AIR",
  AIR: "AIR",
  AIR_FILTER: "AIR",
  PRIMARY_AIR: "AIR",
  SECONDARY_AIR: "AIR",
  PANEL: "AIR",
  ROUND: "AIR",
  RADIALSEAL: "AIR",
  SAFETY: "AIR",

  // ---------------------
  // CABIN FILTER
  // ---------------------
  CABIN: "CABIN",
  CABIN: "CABIN",
  AC: "CABIN",
  AIRCABIN: "CABIN",
  AIRCONDITIONER: "CABIN",
  HVAC: "CABIN",

  // ---------------------
  // HYDRAULIC FILTER
  // ---------------------
  HYDRAULIC: "HYDRAULIC",
  HYDRAULICS: "HYDRAULIC",
  HYDRO: "HYDRAULIC",
  HYDRO_FILTER: "HYDRAULIC",

  // ---------------------
  // COOLANT FILTER
  // ---------------------
  COOLANT: "COOLANT",
  ELC: "COOLANT",
  EXTENDED_LIFE: "COOLANT",

  // ---------------------
  // TURBINE (HD)
  // ---------------------
  TURBINE: "TURBINE",
  RACOR: "TURBINE",
  PARKER: "TURBINE",
  TURBINE: "TURBINE",

  // ---------------------
  // MARINE
  // ---------------------
  MARINE: "MARINE",
  MARINE: "MARINE",
  BOAT: "MARINE",
  OUTBOARD: "MARINE",
  MERCRUISER: "MARINE",

  // ---------------------
  // HOUSING (AIR HOUSING de AIR)
  // ---------------------
  HOUSING: "HOUSING",
  AIR_HOUSING: "HOUSING",
  AIRBOX: "HOUSING",
  ASSEMBLY: "HOUSING",
  AIR_ASSEMBLY: "HOUSING",
});

/**
 * Normaliza la familia usando sinónimos corporativos
 */
function normalizeFamily(family) {
  const key = clean(family);
  return FAMILY_SYNONYMS[key] || null;
}

/**
 * =============================================================================
 * MAPA OFICIAL family|duty → prefijo inmutable
 * =============================================================================
 */

function getPrefix(family, duty) {
  const fam = normalizeFamily(family);
  const dt = String(duty || "").toUpperCase();

  if (!fam || !dt) {
    console.error(`❌ Missing family/duty: family='${family}' duty='${duty}'`);
    return null;
  }

  const KEY = `${fam}|${dt}`;

  const map = {
    // LD & HD compartidos
    "OIL|LD": PREFIXES.OIL_LD,
    "OIL|HD": PREFIXES.OIL_HD,

    "FUEL|LD": PREFIXES.FUEL_LD,
    "FUEL|HD": PREFIXES.FUEL_HD,

    "AIR|LD": PREFIXES.AIR_LD,
    "AIR|HD": PREFIXES.AIR_HD,

    "CABIN|LD": PREFIXES.CABIN_LD,
    "CABIN|HD": PREFIXES.CABIN_HD,

    // Especializados HD
    "TURBINE|HD": PREFIXES.TURBINE_HD,
    "HYDRAULIC|HD": PREFIXES.HYDRAULIC_HD,
    "SEPARATOR|HD": PREFIXES.SEPARATOR_HD,
    "COOLANT|HD": PREFIXES.COOLANT_HD,

    // Air Housings
    "HOUSING|HD": PREFIXES.AIR_HOUSING_HD,

    // MARINE
    "MARINE|LD": PREFIXES.MARINE_ANY,
    "MARINE|HD": PREFIXES.MARINE_ANY,
  };

  const result = map[KEY];

  if (!result) {
    console.error(`❌ No prefix for combination: ${KEY}`);
    return null;
  }

  return result;
}

module.exports = { getPrefix, normalizeFamily };
