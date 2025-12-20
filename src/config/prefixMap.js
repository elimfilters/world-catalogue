// ============================================================================
//  PREFIJOS OFICIALES ELIMFILTERS (INMUTABLES)
//  Este archivo define los prefijos corporativos oficiales utilizados en
//  todos los catálogos, APIs, sistemas internos y productos físicos.
//
//  *** BAJO NINGUNA CIRCUNSTANCIA PUEDE SER MODIFICADO ***
//
//  Protegido mediante:
//  - Object.freeze()
//  - CODEOWNERS (solo el CEO aprueba cambios)
//  - Validación de integridad al arrancar el servidor (policyGuard)
// ============================================================================

const PREFIXES = Object.freeze({

  // ------------------------------------------------------------------------
  // LIGHT DUTY (LD) & HEAVY DUTY (HD) — COMPARTIDOS
  // ------------------------------------------------------------------------
  OIL_LD: "EL8",
  OIL_HD: "EL8",

  FUEL_LD: "EF9",
  FUEL_HD: "EF9",

  AIR_LD: "EA1",
  AIR_HD: "EA1",

  CABIN_LD: "EC1",
  CABIN_HD: "EC1",

  // ------------------------------------------------------------------------
  // HEAVY DUTY — ESPECIALIZADOS
  // ------------------------------------------------------------------------
  TURBINE_HD: "ET9",          // TURBINEs Donaldson / Racor / Parker
  HYDRAULIC_HD: "EH6",        // Hidráulicos HD
  SEPARATOR_HD: "ES9",        // Filtros FUEL FILTER SEPARATORes de agua (Racor/Parker)
  COOLANT_HD: "EW7",          // Coolant / Extended Life Coolant Filters

  // ------------------------------------------------------------------------
  // AIR HOUSINGS (AIR HOUSINGs de AIR)
  // ------------------------------------------------------------------------
  AIR_HOUSING_LD: "EA2",
  AIR_HOUSING_HD: "EA2",

  // ------------------------------------------------------------------------
  // MARINES — TODOS LOS TIPOS
  // ------------------------------------------------------------------------
  MARINE_ANY: "EM9",          // MARINEs general, FUEL/OIL/AIR
  TURBINE_MARINE: "EM9",      // Racor Marine Series

  // ------------------------------------------------------------------------
  // KITS ELIMFILTERS — OFICIALES
  // ------------------------------------------------------------------------
  KIT_LD: "EK3",              // Kits Light Duty
  KIT_HD: "EK5",              // Kits Heavy Duty
});

// ============================================================================
//  FUNCIÓN DE RESOLUCIÓN: resolveBrandFamilyDutyByPrefix
//  Analiza un código normalizado y devuelve brand, family y duty
// ============================================================================

/**
 * Resuelve brand, family y duty basándose en el código del filtro
 * @param {string} code - Código normalizado del filtro (ej: "P552100", "FS19532")
 * @returns {object} - { brand: string|null, family: string|null, duty: string|null }
 */
function resolveBrandFamilyDutyByPrefix(code) {
  if (!code || typeof code !== 'string') {
    return { brand: null, family: null, duty: null };
  }

  const codeUpper = code.toUpperCase();

  // ============================================================================
  // DETECCIÓN DE BRAND (DONALDSON vs FRAM)
  // ============================================================================
  
  // DONALDSON: Prefijos P, B, C, X, G, H, R, DBL, ECB, ECC, FPG, FWS, etc.
  const donaldsonPrefixes = /^(P|B|C|X|G|H|R|DBL|ECB|ECC|FPG|FWS|HF|FS|DBF|DBA|DBP|EAF|ECC|ECG|FH|FPG|FRG|FSG|FWS|HF|HFP|P|R|X)/;
  
  // FRAM: Prefijos CA, PH, G, CS, etc.
  const framPrefixes = /^(CA|PH|G|CS|CH|HPG|XG|TG|FT|PS)/;

  let brand = null;
  let family = null;
  let duty = null;

  if (donaldsonPrefixes.test(codeUpper)) {
    brand = 'DONALDSON';
    duty = 'HD'; // Por defecto Heavy Duty para Donaldson
    
    // Detectar familia específica
    if (/^P/.test(codeUpper)) {
      family = 'OIL'; // P = Oil filters
    } else if (/^(FS|DBF|FH|FPG|FRG|FSG|FWS)/.test(codeUpper)) {
      family = 'FUEL'; // FS = Fuel/Separator
    } else if (/^(B|EAF|ECB|ECC|ECG)/.test(codeUpper)) {
      family = 'AIR'; // B = Air filters
    } else if (/^(C|DBL|HF|HFP)/.test(codeUpper)) {
      family = 'HYDRAULIC'; // C/HF = Hydraulic
    } else if (/^(X|DBA|DBP)/.test(codeUpper)) {
      family = 'CABIN'; // X = Cabin Air
    } else if (/^R/.test(codeUpper)) {
      family = 'TURBINE'; // R = Racor (Turbine/Marine)
    }
    
  } else if (framPrefixes.test(codeUpper)) {
    brand = 'FRAM';
    duty = 'LD'; // Por defecto Light Duty para FRAM
    
    // Detectar familia específica
    if (/^(PH|HPG|XG|TG|PS)/.test(codeUpper)) {
      family = 'OIL'; // PH = Oil filters
    } else if (/^(G|CS)/.test(codeUpper)) {
      family = 'FUEL'; // G/CS = Fuel
    } else if (/^CA/.test(codeUpper)) {
      family = 'AIR'; // CA = Air filters
    } else if (/^(CH|FT)/.test(codeUpper)) {
      family = 'CABIN'; // CH = Cabin Air
    }
  }

  return { brand, family, duty };
}

// ============================================================================
//  EXPORTACIONES
// ============================================================================

module.exports = PREFIXES;
module.exports.resolveBrandFamilyDutyByPrefix = resolveBrandFamilyDutyByPrefix;
module.exports.PREFIXES = PREFIXES;
