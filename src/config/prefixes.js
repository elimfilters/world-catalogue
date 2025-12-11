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
//  - Validación de integridad al arrancar el servidor
// ============================================================================

const PREFIXES = Object.freeze({

  // ------------------------------------------------------------------------
  // LD & HD (compartidos)
  // ------------------------------------------------------------------------
  OIL_LD: "EL8",
  OIL_HD: "EL8",

  FUEL_LD: "EF9",
  FUEL_HD: "EF9",

  AIRE_LD: "EA1",
  AIRE_HD: "EA1",

  CABIN_LD: "EC1",
  CABIN_HD: "EC1",

  // ------------------------------------------------------------------------
  // Heavy Duty — Especializados
  // ------------------------------------------------------------------------
  TURBINE_HD: "ET9",
  HYDRAULIC_HD: "EH6",
  SEPARATOR_HD: "ES9",
  COOLANT_HD: "EW7",

  // ------------------------------------------------------------------------
  // Air Housings (Carcasas de Aire)
  // ------------------------------------------------------------------------
  AIR_HOUSING_LD: "EA2",
  AIR_HOUSING_HD: "EA2",

  // ------------------------------------------------------------------------
  // MARINO — Todos los tipos
  // ------------------------------------------------------------------------
  MARINE_ANY: "EM9",
  TURBINE_MARINE: "EM9",

  // ------------------------------------------------------------------------
  // Kits
  // ------------------------------------------------------------------------
  KIT_LD: "EK3",
  KIT_HD: "EK5",
});

module.exports = PREFIXES;