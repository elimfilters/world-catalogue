/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ELIMFILTERS™ DNA - MOTOR DE REGLAS DE NEGOCIO
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Este archivo contiene el ADN completo del sistema ELIMFILTERS™.
 * Define todas las reglas de clasificación, prefijos, tecnologías y mapeos.
 * 
 * VERSION: 1.0.0
 * ÚLTIMA ACTUALIZACIÓN: 2025-01-06
 * 
 * FILOSOFÍA:
 * - Los scrapers extraen datos técnicos PUROS (sin prefijos)
 * - Este motor analiza especificaciones y tipo de motor
 * - Determina clasificación Heavy Duty vs Light Duty vs Marine
 * - Asigna prefijos y tecnologías ELIMFILTERS™
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// SECCIÓN 1: PREFIJOS ELIMFILTERS™
// ═══════════════════════════════════════════════════════════════════════════

const ELIMFILTERS_PREFIXES = {
  
  // ─────────────────────────────────────────────────────────────────────────
  // ACEITE LUBRICANTE (Lube Oil)
  // ─────────────────────────────────────────────────────────────────────────
  EL8: {
    category: "Lube Oil Filters",
    technology: "SYNTRAX™",
    description: "Filtros de aceite lubricante para motores diésel y gasolina",
    applications: ["Motores diésel pesados", "Motores gasolina ligeros", "Industrial"],
    cross_reference: {
      heavy_duty: "Donaldson P-Series",
      light_duty: "FRAM PH/XG-Series"
    }
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // AIRE (Air System)
  // ─────────────────────────────────────────────────────────────────────────
  EA1: {
    category: "Air Filter Elements",
    technology: "NANOFORCE™",
    description: "Elementos filtrantes de aire (cartuchos)",
    applications: ["Admisión de aire motor", "Sistemas turbo", "Industrial"],
    cross_reference: {
      heavy_duty: "Donaldson B/R-Series",
      light_duty: "FRAM CA-Series"
    }
  },
  
  EA2: {
    category: "Air Filter Housings",
    technology: "NANOFORCE™",
    description: "Carcasas completas de filtro de aire con elemento",
    applications: ["Sistemas de admisión completos", "Heavy duty"],
    cross_reference: {
      heavy_duty: "Donaldson Complete Air Housings"
    }
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // COMBUSTIBLE (Fuel System)
  // ─────────────────────────────────────────────────────────────────────────
  EF9: {
    category: "Fuel Filters",
    technology: "SYNTEPORE™",
    description: "Filtros de combustible estándar y separadores agua/combustible",
    applications: ["Diésel", "Gasolina", "Biodiesel", "Separadores estándar"],
    cross_reference: {
      heavy_duty: "Donaldson X-Series, Racor Standard (R90P, etc.)",
      light_duty: "FRAM CS/PS-Series"
    },
    notes: "Incluye separadores NO-Turbina FH (R90P, spin-on, etc.)"
  },
  
  ET9: {
    category: "Turbine Fuel/Water Separators",
    technology: "AQUAGUARD™",
    description: "Separadores combustible/agua EXCLUSIVOS para Turbinas FH Series",
    applications: ["Turbina 1000FH", "Turbina 900FH", "Turbina 500FH", "Cartuchos 2020 Series"],
    cross_reference: {
      heavy_duty: "Racor 1000FH, 900FH, 500FH, 2020PM, 2020TM, 2020SM"
    },
    exclusive: true,
    notes: "SOLO Turbinas Racor FH + Cartuchos 2020. Todo lo demás va a EF9"
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // HIDRÁULICO (Hydraulic System)
  // ─────────────────────────────────────────────────────────────────────────
  EH6: {
    category: "Hydraulic Filters",
    technology: "SYNTRAX™",
    description: "Filtros para sistemas hidráulicos",
    applications: ["Sistemas hidráulicos maquinaria", "Industrial", "Mobile equipment"],
    cross_reference: {
      heavy_duty: "Donaldson H-Series, Parker Hydraulic"
    }
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // REFRIGERANTE (Coolant System)
  // ─────────────────────────────────────────────────────────────────────────
  EW7: {
    category: "Coolant Filters",
    technology: "SYNTRAX™",
    description: "Filtros de refrigerante con aditivos SCA",
    applications: ["Sistemas de enfriamiento motor", "Heavy duty diesel"],
    cross_reference: {
      heavy_duty: "Donaldson C-Series"
    }
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // CABINA (Cabin Air)
  // ─────────────────────────────────────────────────────────────────────────
  EC1: {
    category: "Cabin Air Filters",
    technology: "MICROKAPPA™",
    description: "Filtros de aire de cabina con carbón activado",
    applications: ["Climatización cabina", "HVAC", "Passenger comfort"],
    cross_reference: {
      heavy_duty: "Donaldson Cabin Series",
      light_duty: "FRAM CF-Series"
    }
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // SECANTE AIRE (Air Dryer)
  // ─────────────────────────────────────────────────────────────────────────
  ED4: {
    category: "Air Dryer Cartridges",
    technology: "DESICCANT™",
    description: "Cartuchos secantes para sistemas de frenos de aire",
    applications: ["Sistemas neumáticos", "Frenos de aire", "Air brake systems"],
    cross_reference: {
      heavy_duty: "Donaldson Air Dryer, Bendix"
    }
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // SEPARADOR ACEITE (Oil Separator)
  // ─────────────────────────────────────────────────────────────────────────
  ES9: {
    category: "Oil Separators",
    technology: "SYNTRAX™",
    description: "Separadores aceite/aire para compresores y motores",
    applications: ["Compresores", "Sistemas PCV", "Crankcase ventilation"],
    cross_reference: {
      heavy_duty: "Donaldson Oil/Air Separators"
    }
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // MARINO (Marine)
  // ─────────────────────────────────────────────────────────────────────────
  EM9: {
    category: "Marine Filters",
    technology: "MARINEGUARD™",
    description: "Filtros para motores marinos (intraborda y fuera de borda)",
    applications: ["Motores marinos", "Inboard", "Outboard", "Marine diesel"],
    cross_reference: {
      marine: "Sierra, Mercury Marine, Yamaha Marine"
    },
    exclusive: true
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// SECCIÓN 2: TECNOLOGÍAS ELIMFILTERS™
// ═══════════════════════════════════════════════════════════════════════════

const ELIMFILTERS_TECHNOLOGIES = {
  
  "SYNTRAX™": {
    tier: "STANDARD",
    media: "Celulosa Sintética Reforzada",
    efficiency: "95-98%",
    life_expectancy: "Standard service intervals",
    applications: ["Aceite", "Hidráulico", "Refrigerante", "Separadores Aceite"],
    equivalent_to: ["Celulosa estándar", "Synthetic blend"]
  },
  
  "NANOFORCE™": {
    tier: "ELITE",
    media: "Nanofibra Sintética (Ultra-Web™ equivalent)",
    efficiency: "99.9%",
    life_expectancy: "Extended service intervals",
    applications: ["Aire", "Aceite Premium"],
    equivalent_to: ["Donaldson Ultra-Web", "Donaldson Blue", "FRAM Ultra Synthetic"]
  },
  
  "SYNTEPORE™": {
    tier: "STANDARD",
    media: "Media Sintética Porosa de Alta Capacidad",
    efficiency: "98% @ rated micron",
    life_expectancy: "Standard fuel system intervals",
    applications: ["Combustible", "Separadores agua/combustible estándar"],
    equivalent_to: ["Celulosa combustible", "Standard fuel media"]
  },
  
  "AQUAGUARD™": {
    tier: "ELITE",
    media: "Aquabloc® / Turbine™ Series Media",
    efficiency: "99% Water Separation",
    life_expectancy: "Extended intervals with water monitoring",
    applications: ["Separadores Turbina FH EXCLUSIVO"],
    exclusive: ["Racor 1000FH", "Racor 900FH", "Racor 500FH", "2020 Series"],
    equivalent_to: ["Racor Aquabloc", "Racor Turbine"]
  },
  
  "MARINEGUARD™": {
    tier: "MARINE",
    media: "Marine-Grade Synthetic (corrosion resistant)",
    efficiency: "Marine OEM Standards",
    life_expectancy: "Marine service intervals",
    applications: ["Motores marinos"],
    equivalent_to: ["Sierra Marine", "Mercury Marine OEM"]
  },
  
  "MICROKAPPA™": {
    tier: "STANDARD",
    media: "Microfibra Multi-Capa + Carbón Activado",
    efficiency: "Cabin air quality standards",
    life_expectancy: "12-15 months / 15,000 km",
    applications: ["Aire cabina", "HVAC"],
    equivalent_to: ["FRAM Fresh Breeze", "Cabin air standard"]
  },
  
  "DURAFLOW™": {
    tier: "STANDARD",
    media: "Celulosa Reforzada con Resina",
    efficiency: "Standard",
    life_expectancy: "Standard intervals",
    applications: ["Light Duty applications", "FRAM equivalents"],
    equivalent_to: ["FRAM Extra Guard", "FRAM Tough Guard"]
  },
  
  "DESICCANT™": {
    tier: "SPECIALIZED",
    media: "Gel de Sílice / Tamiz Molecular",
    efficiency: "Air drying to -40°F dew point",
    life_expectancy: "Per air system requirements",
    applications: ["Secante aire comprimido", "Frenos neumáticos"],
    equivalent_to: ["Bendix AD-Series", "Donaldson Air Dryer"]
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// SECCIÓN 3: CLASIFICACIÓN DE DUTY
// ═══════════════════════════════════════════════════════════════════════════

const DUTY_CLASSIFICATION = {
  
  HEAVY_DUTY: {
    description: "Motores diésel pesados, aplicaciones industriales y on-highway",
    manufacturers: ["Donaldson", "Racor Parker"],
    cross_reference_to: "Donaldson",
    
    engine_indicators: [
      "diesel", "diésel", "turbo", "turbocharged",
      "heavy duty", "class 8", "on-highway", "off-highway"
    ],
    
    oem_indicators: [
      "caterpillar", "cat", "cummins", "detroit", "mack", "volvo",
      "kenworth", "peterbilt", "freightliner", "international",
      "paccar", "navistar", "john deere", "case", "new holland"
    ],
    
    application_indicators: [
      "construction", "mining", "agriculture", "industrial",
      "generator", "marine diesel", "truck", "bus"
    ]
  },
  
  LIGHT_DUTY: {
    description: "Motores gasolina ligeros, passenger vehicles",
    manufacturers: ["FRAM"],
    cross_reference_to: "FRAM",
    
    engine_indicators: [
      "gasoline", "gasolina", "petrol", "passenger",
      "light duty", "automotive"
    ],
    
    oem_indicators: [
      "honda", "toyota", "ford", "chevrolet", "gm", "dodge",
      "nissan", "hyundai", "kia", "mazda", "subaru",
      "volkswagen", "audi", "bmw", "mercedes"
    ],
    
    application_indicators: [
      "car", "auto", "suv", "pickup", "van",
      "passenger vehicle", "light truck"
    ]
  },
  
  MARINE: {
    description: "Motores marinos intraborda y fuera de borda",
    manufacturers: ["Sierra", "Mercury Marine", "Yamaha Marine"],
    cross_reference_to: "Sierra",
    
    engine_indicators: [
      "marine", "marino", "inboard", "outboard",
      "sterndrive", "jet drive"
    ],
    
    oem_indicators: [
      "mercury", "yamaha", "suzuki", "honda marine",
      "volvo penta", "mercruiser", "evinrude"
    ],
    
    application_indicators: [
      "boat", "watercraft", "marine engine",
      "recreational marine", "commercial marine"
    ]
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// SECCIÓN 4: REGLAS ESPECIALES
// ═══════════════════════════════════════════════════════════════════════════

const SPECIAL_RULES = {
  
  // Turbinas Racor FH - ET9 EXCLUSIVO
  RACOR_TURBINE_FH: {
    models: ["1000FH", "900FH", "500FH"],
    cartridges: ["2020PM", "2020TM", "2020SM", "2020"],
    prefix: "ET9",
    technology: "AQUAGUARD™",
    rule: "SOLO estos modelos van a ET9. Todo lo demás (R90P, etc.) va a EF9"
  },
  
  // Separadores estándar - EF9
  RACOR_STANDARD_SEPARATORS: {
    models: ["R90P", "R120P", "500FG", "120AS", "spin-on series"],
    prefix: "EF9",
    technology: "SYNTEPORE™",
    rule: "Separadores NO-Turbina FH"
  },
  
  // Marine - EM9
  MARINE_FILTERS: {
    brands: ["Sierra", "Mercury Marine"],
    prefix: "EM9",
    technology: "MARINEGUARD™",
    rule: "Todos los filtros marinos independiente del tipo"
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// SECCIÓN 5: FUNCIONES CORE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Genera SKU ELIMFILTERS™
 * @param {string} prefix - Prefijo (EL8, EA1, etc.)
 * @param {string} oem_code - Código OEM original
 * @returns {string} SKU ELIMFILTERS™ formato: PREFIX-CLEANCODE
 */
function generateSKU(prefix, oem_code) {
  if (!prefix || !oem_code) {
    throw new Error("generateSKU requiere prefix y oem_code");
  }
  
  // Limpiar código OEM (remover guiones, espacios, caracteres especiales)
  const cleanCode = oem_code
    .toString()
    .replace(/[^A-Z0-9]/gi, "")
    .toUpperCase();
  
  // Formato: PREFIX-CLEANCODE
  return `${prefix}-${cleanCode}`;
}

/**
 * Valida si un prefijo es válido
 * @param {string} prefix - Prefijo a validar
 * @returns {boolean}
 */
function isValidPrefix(prefix) {
  return Object.keys(ELIMFILTERS_PREFIXES).includes(prefix);
}

/**
 * Obtiene información completa de un prefijo
 * @param {string} prefix - Prefijo
 * @returns {Object} Información del prefijo
 */
function getPrefixInfo(prefix) {
  if (!isValidPrefix(prefix)) {
    throw new Error(`Prefijo inválido: ${prefix}`);
  }
  return ELIMFILTERS_PREFIXES[prefix];
}

/**
 * Obtiene información completa de una tecnología
 * @param {string} technology - Nombre de tecnología
 * @returns {Object} Información de la tecnología
 */
function getTechnologyInfo(technology) {
  if (!ELIMFILTERS_TECHNOLOGIES[technology]) {
    throw new Error(`Tecnología inválida: ${technology}`);
  }
  return ELIMFILTERS_TECHNOLOGIES[technology];
}

/**
 * Lista todos los prefijos disponibles
 * @returns {Array} Array de prefijos
 */
function listAllPrefixes() {
  return Object.keys(ELIMFILTERS_PREFIXES);
}

/**
 * Lista todas las tecnologías disponibles
 * @returns {Array} Array de tecnologías
 */
function listAllTechnologies() {
  return Object.keys(ELIMFILTERS_TECHNOLOGIES);
}

// ═══════════════════════════════════════════════════════════════════════════
// SECCIÓN 6: EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  // Datos
  ELIMFILTERS_PREFIXES,
  ELIMFILTERS_TECHNOLOGIES,
  DUTY_CLASSIFICATION,
  SPECIAL_RULES,
  
  // Funciones
  generateSKU,
  isValidPrefix,
  getPrefixInfo,
  getTechnologyInfo,
  listAllPrefixes,
  listAllTechnologies,
  
  // Metadata
  VERSION: "1.0.0",
  LAST_UPDATE: "2025-01-06"
};
