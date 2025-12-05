// ============================================================================
// ELIMFILTERS™ - Tecnologías Propias (Con Referencias)
// Módulo de registro y selección de tecnología aplicada por familia/duty/código
// ============================================================================

'use strict';

// Registro de tecnologías: nombre → { description, reference }
const TECHNOLOGY_REGISTRY = {
  // I. Tecnologías líquidas (Aceite, Combustible, Hidráulico)
  'ELIMTEK™ MultiCore': {
    description:
      'Medio de profundidad de densidad graduada. Estructura multi-capa que incrementa capacidad de retención de suciedad y mantiene alta eficiencia Beta (β) constante.',
    reference: 'StrataPore® (Medios multi-capa)'
  },
  'ELIMTEK™ Blend': {
    description:
      'Medio de fibras mixtas (celulosa y sintético). Combina economía de celulosa con eficiencia y durabilidad mejorada de fibras sintéticas.',
    reference: 'Synthetic Blend / StrataPore® (Versión intermedio)'
  },
  'ELIMTEK™ Standard': {
    description:
      'Medio base de celulosa de alta calidad para servicios estándar. Equilibrio costo/beneficio con buen desempeño en condiciones normales.',
    reference: 'Celulosa estándar (equivalente a "Extra Guard" en FRAM)'
  },
  'HydroFlow 5000': {
    description:
      'Medio de microfibra de vidrio de ultra-eficiencia. Diseñado para alcanzar y mantener pureza ISO en sistemas hidráulicos de alta presión.',
    reference: 'MicroGlass / Medios sintéticos de alta resistencia'
  },
  'AquaCore Pro': {
    description:
      'Medio coalescente mejorado. Maximiza separación de agua y contaminantes del combustible, protegiendo inyectores de alta presión.',
    reference: 'Tecnologías de separación de agua de alta eficiencia'
  },

  // II. Filtración de aire y sistemas secos
  'MACROCORE™ NanoMax': {
    description:
      'Medio de nanofibra sintética avanzada. Atrapa partículas submicrónicas en superficie con alta eficiencia, menor restricción y vida útil prolongada.',
    reference: 'NanoNet®'
  },
  'MACROCORE™': {
    description:
      'Medio de alta capacidad para aire. Gran retención de polvo, flujo óptimo y protección consistente en operación.',
    reference: 'Medios de aire convencionales / Direct Flow™'
  },
  'MICROKAPPA™': {
    description:
      'Medio multicapa con carbón activado. Filtra partículas ultrafinas, polen y gases; neutraliza olores en cabina.',
    reference: 'Filtros de cabina de carbón activado'
  },
  // Variantes específicas de cabina
  'MICROKAPPA™ Carbon': {
    description:
      'Medio de carbón activado para cabina. Enfoque en adsorción de olores y gases nocivos, con filtración particulada estándar.',
    reference: 'Cabin Air con carbón activado (Fleetguard/Cummins)'
  },
  'MICROKAPPA™ Particulate': {
    description:
      'Medio particulado de alta eficiencia para cabina. Captura polen, polvo fino y bacterias sin capa de carbón.',
    reference: 'Cabin Air particulado estándar (Fleetguard/Cummins)'
  },
  'AeroDry Max': {
    description:
      'Desecante de alto rendimiento con pre-filtración. Cartuchos para remover humedad y vapor del sistema de aire de frenos.',
    reference: 'Cartuchos de Air Dryer estándar'
  },

  // III. Sistemas de refrigeración
  'ThermoRelease™': {
    description:
      'Sistema de liberación controlada de aditivos (DCA) para prevenir corrosión y cavitación, manteniendo la química del refrigerante.',
    reference: 'FleetCool® / Filtros de refrigerante con DCA'
  }
};

// Heurísticas de asignación por familia/duty/código
function getTechnology(family, duty = '', code = '') {
  const fam = String(family || '').toUpperCase();
  const dy = String(duty || '').toUpperCase();
  const c = String(code || '').toUpperCase();

  // Aceite
  if (fam === 'OIL') {
    return dy === 'LD' ? 'ELIMTEK™ Blend' : 'ELIMTEK™ MultiCore';
  }

  // Combustible
  if (fam === 'FUEL') {
    // Indicadores de separación de agua/coalescente
    const waterSepHint = /(WS|SEPARATOR|WATER|SEPARADOR)/.test(c);
    return waterSepHint ? 'AquaCore Pro' : (dy === 'LD' ? 'ELIMTEK™ Blend' : 'ELIMTEK™ MultiCore');
  }

  // Hidráulico
  if (fam === 'HYDRAULIC' || fam === 'HIDRAULIC') {
    return 'HydroFlow 5000';
  }

  // Aire
  if (fam === 'AIR' || fam === 'AIRE') {
    return dy === 'LD' ? 'MACROCORE™' : 'MACROCORE™ NanoMax';
  }

  // Cabina
  if (fam === 'CABIN' || fam === 'CABIN AIR') {
    return 'MICROKAPPA™';
  }

  // Air Dryer
  if (fam === 'AIR DRYER' || fam === 'AIR_DRYER') {
    return 'AeroDry Max';
  }

  // Refrigerante
  if (fam === 'COOLANT') {
    return 'ThermoRelease™';
  }

  // Marinos: usar tecnologías líquidas por defecto
  if (fam === 'MARINE' || fam === 'MARINE FILTER') {
    return dy === 'LD' ? 'ELIMTEK™ Blend' : 'ELIMTEK™ MultiCore';
  }

  // Fallback conservador (seguro legal)
  if (['OIL','FUEL','HYDRAULIC','COOLANT'].includes(fam)) {
    return 'ELIMTEK™ MultiCore';
  }
  return 'MACROCORE™';
}

function getTechnologyInfo(name) {
  const n = String(name || '').trim();
  return TECHNOLOGY_REGISTRY[n] || { description: 'Tecnología ELIMFILTERS', reference: 'N/A' };
}

function getTechnologyDescription(name) {
  return getTechnologyInfo(name).description;
}

function getTechnologyReference(name) {
  return getTechnologyInfo(name).reference;
}

function getAllTechnologies() {
  return Object.keys(TECHNOLOGY_REGISTRY);
}

module.exports = {
  TECHNOLOGY_REGISTRY,
  getTechnology,
  getTechnologyInfo,
  getTechnologyDescription,
  getTechnologyReference,
  getAllTechnologies
};