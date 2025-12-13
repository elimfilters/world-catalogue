// ============================================================================
// FILTER TYPE FIELD MAPPING - Campos relevantes por tipo de filtro
// ============================================================================

/**
 * Define qué campos son relevantes para cada tipo de filtro
 * Si un campo no está en la lista, NO se debe mostrar ni guardar
 */

const FILTER_TYPE_FIELDS = {
  
  // ==========================================================================
  // AIR FILTERS (AIRE/CABIN AIR)
  // ==========================================================================
  'AIR': {
    family_aliases: ['AIRE', 'AIR', 'AIR FILTER', 'ENGINE AIR'],
    
    dimensions: [
      'height_mm',
      'outer_diameter_mm',
      'inner_diameter_mm',
      'length_mm',
      'width_mm',
      'thickness_mm',
      'panel_height_mm',
      'panel_width_mm',
      'panel_depth_mm'
    ],
    
    performance: [
      'air_flow_cfm',           // CFM (Cubic Feet per Minute)
      'dust_capacity_grams',    // Capacidad de polvo
      'initial_restriction_inches_h2o', // Restricción inicial
      'max_restriction_inches_h2o',     // Restricción máxima
      'efficiency_percent',     // Eficiencia de filtración
      'pleat_count',           // Número de pliegues
      'media_area_sq_ft'       // Área de medio filtrante
    ],
    
    materials: [
      'media_type',            // Tipo de medio (celulosa, sintético, etc)
      'seal_material',         // Material del sello
      'end_cap_material',      // Material de tapa
      'housing_material'       // Material de carcasa
    ],
    
    technical: [
      'filter_class',          // Clase de filtro (primario, secundario)
      'filter_efficiency_rating', // ISO 5011 rating
      'service_life_hours',
      'cleaning_method',       // Método de limpieza (reusable vs desechable)
      'operating_temperature_min_c',
      'operating_temperature_max_c'
    ],
    
    // Campos que NO aplican para Air
    excluded: [
      'thread_size',           // No tiene rosca
      'gasket_od_mm',          // No tiene gasket de rosca
      'bypass_valve_psi',      // No tiene válvula bypass
      'anti_drainback_valve',  // No tiene válvula anti-retorno
      'flow_gph',              // No mide flujo de líquido
      'flow_lph',
      'micron_rating',         // No aplica micrones como en aceite
      'beta_ratio',            // Ratio beta es para líquidos
      'water_separation_efficiency_percent' // No separa agua
    ]
  },
  
  // ==========================================================================
  // CABIN AIR FILTERS
  // ==========================================================================
  'CABIN': {
    family_aliases: ['CABIN', 'CABIN AIR', 'CABIN FILTER', 'A/C FILTER'],
    
    dimensions: [
      'height_mm',
      'width_mm',
      'thickness_mm',
      'length_mm'
    ],
    
    performance: [
      'air_flow_cfm',
      'dust_capacity_grams',
      'pollen_filtration_percent',    // % filtración de polen
      'bacteria_filtration_percent',   // % filtración bacterias
      'activated_carbon',              // ¿Tiene carbón activado? (true/false)
      'odor_reduction',                // Reducción de olores
      'particle_size_filtered_microns' // Tamaño de partícula filtrada
    ],
    
    materials: [
      'media_type',
      'frame_material',
      'activated_carbon_layer'  // Capa de carbón activado
    ],
    
    technical: [
      'filter_type',           // Partículas, carbón activado, HEPA
      'hepa_certified',        // Certificación HEPA
      'service_interval_months',
      'service_interval_miles',
      'operating_temperature_min_c',
      'operating_temperature_max_c'
    ],
    
    excluded: [
      'thread_size',
      'gasket_od_mm',
      'bypass_valve_psi',
      'anti_drainback_valve',
      'flow_gph',
      'flow_lph',
      'beta_ratio',
      'water_separation_efficiency_percent',
      'oil_capacity_quarts'
    ]
  },
  
  // ==========================================================================
  // OIL FILTERS
  // ==========================================================================
  'OIL': {
    family_aliases: ['OIL', 'ENGINE OIL', 'ACEITE'],
    
    dimensions: [
      'height_mm',
      'outer_diameter_mm',
      'thread_size',           // ⭐ Crítico para Oil
      'gasket_od_mm',          // ⭐ Crítico para Oil
      'base_gasket_id_mm',
      'base_gasket_thickness_mm'
    ],
    
    performance: [
      'flow_gph',              // ⭐ Galones por hora
      'flow_lph',              // ⭐ Litros por hora
      'micron_rating',         // ⭐ Tamaño de partícula (ej: 20 micrones)
      'beta_ratio',            // ⭐ Ratio beta (ej: β20=75)
      'efficiency_percent',    // Eficiencia de filtración
      'dirt_holding_capacity_grams', // Capacidad de retención
      'bypass_valve_psi',      // ⭐ Presión de válvula bypass
      'anti_drainback_valve'   // ⭐ Válvula anti-retorno (true/false)
    ],
    
    materials: [
      'media_type',
      'gasket_material',       // Material del gasket
      'seal_material',
      'center_tube_material',
      'end_cap_material'
    ],
    
    technical: [
      'filter_type',           // Spin-on, cartridge, etc
      'oil_capacity_quarts',   // Capacidad de aceite del filtro
      'iso_test_method',       // ISO 4548-12
      'operating_pressure_max_psi',
      'operating_temperature_min_c',
      'operating_temperature_max_c',
      'service_interval_miles',
      'service_interval_hours'
    ],
    
    excluded: [
      'air_flow_cfm',          // No mide flujo de aire
      'dust_capacity_grams',   // Es "dirt holding" no "dust"
      'pollen_filtration_percent',
      'water_separation_efficiency_percent', // No separa agua (es fuel)
      'primary_secondary'      // No aplica primario/secundario
    ]
  },
  
  // ==========================================================================
  // FUEL FILTERS
  // ==========================================================================
  'FUEL': {
    family_aliases: ['FUEL', 'DIESEL FUEL', 'GASOLINE', 'COMBUSTIBLE'],
    
    dimensions: [
      'height_mm',
      'outer_diameter_mm',
      'thread_size',           // Si es spin-on
      'inlet_size',            // Tamaño de entrada
      'outlet_size',           // Tamaño de salida
      'mounting_thread'        // Rosca de montaje
    ],
    
    performance: [
      'flow_gph',              // ⭐ Crítico
      'flow_lph',              // ⭐ Crítico
      'micron_rating',         // ⭐ Tamaño de filtración (ej: 10 micrones)
      'beta_ratio',            // Ratio beta
      'water_separation_efficiency_percent', // ⭐⭐ MUY CRÍTICO para Fuel
      'water_capacity_oz',     // Capacidad de agua separada
      'dirt_holding_capacity_grams',
      'restriction_max_psi'    // Restricción máxima
    ],
    
    materials: [
      'media_type',
      'seal_material',
      'housing_material',
      'water_drain_plug'       // Tapón de drenaje de agua
    ],
    
    technical: [
      'filter_type',           // Primario, secundario, separador agua
      'fuel_type',             // Diesel, gasoline, biodiesel
      'primary_secondary',     // ⭐ Crítico: primario o secundario
      'water_separator',       // ¿Tiene separador de agua? (true/false)
      'water_sensor',          // ¿Tiene sensor de agua? (true/false)
      'heater_element',        // ¿Tiene elemento calefactor? (true/false)
      'service_interval_hours',
      'operating_temperature_min_c',
      'operating_temperature_max_c'
    ],
    
    excluded: [
      'air_flow_cfm',
      'pollen_filtration_percent',
      'anti_drainback_valve',  // Es de oil
      'bypass_valve_psi',      // Diferente en fuel
      'oil_capacity_quarts'
    ]
  },
  
  // ==========================================================================
  // HYDRAULIC FILTERS
  // ==========================================================================
  'HYDRAULIC': {
    family_aliases: ['HYDRAULIC', 'HYD', 'HIDRAULICO'],
    
    dimensions: [
      'height_mm',
      'outer_diameter_mm',
      'inner_diameter_mm',
      'thread_size'
    ],
    
    performance: [
      'flow_gpm',              // Galones por minuto (hydraulic usa GPM no GPH)
      'flow_lpm',              // Litros por minuto
      'micron_rating',
      'beta_ratio',
      'dirt_holding_capacity_grams',
      'collapse_pressure_psi', // Presión de colapso
      'bypass_valve_psi'
    ],
    
    materials: [
      'media_type',
      'seal_material',
      'end_cap_material'
    ],
    
    technical: [
      'filter_type',
      'iso_cleanliness_code',  // Código ISO de limpieza
      'operating_pressure_max_psi',
      'operating_temperature_min_c',
      'operating_temperature_max_c'
    ],
    
    excluded: [
      'air_flow_cfm',
      'water_separation_efficiency_percent',
      'pollen_filtration_percent'
    ]
  },
  
  // ==========================================================================
  // TRANSMISSION FILTERS
  // ==========================================================================
  'TRANSMISSION': {
    family_aliases: ['TRANSMISSION', 'TRANS', 'ATF', 'TRANSMISION'],
    
    dimensions: [
      'height_mm',
      'outer_diameter_mm',
      'inner_diameter_mm'
    ],
    
    performance: [
      'flow_gpm',
      'flow_lpm',
      'micron_rating',
      'dirt_holding_capacity_grams'
    ],
    
    materials: [
      'media_type',
      'gasket_material',
      'screen_material'        // Malla metálica
    ],
    
    technical: [
      'filter_type',           // Spin-on, internal, screen
      'magnet_included',       // ¿Incluye imán?
      'operating_temperature_max_c'
    ],
    
    excluded: [
      'air_flow_cfm',
      'water_separation_efficiency_percent',
      'thread_size'            // Muchos son internos
    ]
  }
};

// ==========================================================================
// FUNCIÓN DE FILTRADO DE CAMPOS
// ==========================================================================

/**
 * Filtra los datos del filtro mostrando SOLO campos relevantes para su tipo
 * @param {Object} filterData - Datos completos del filtro
 * @param {String} family - Familia del filtro (OIL, AIR, FUEL, etc)
 * @returns {Object} - Datos filtrados con solo campos relevantes
 */
function filterRelevantFields(filterData, family) {
  const familyUpper = String(family || '').toUpperCase();
  
  // Encontrar configuración del tipo de filtro
  let config = null;
  for (const [type, cfg] of Object.entries(FILTER_TYPE_FIELDS)) {
    if (cfg.family_aliases.some(alias => familyUpper.includes(alias))) {
      config = cfg;
      break;
    }
  }
  
  // Si no encontramos configuración, retornar todo (por seguridad)
  if (!config) {
    console.log(`⚠️  No filter type config found for family: ${family}`);
    return filterData;
  }
  
  // Crear objeto filtrado
  const filtered = {
    ...filterData,
    attributes: {}
  };
  
  // Filtrar dimensiones
  if (filterData.attributes) {
    const attrs = filterData.attributes;
    
    // Solo incluir campos permitidos
    const allowedFields = [
      ...config.dimensions,
      ...config.performance,
      ...config.materials,
      ...config.technical
    ];
    
    for (const [key, value] of Object.entries(attrs)) {
      // Si el campo está en la lista de permitidos, incluirlo
      if (allowedFields.includes(key)) {
        filtered.attributes[key] = value;
      }
      // Si el campo está explícitamente excluido, NO incluirlo
      else if (config.excluded && config.excluded.includes(key)) {
        console.log(`🚫 Excluded field for ${family}: ${key}`);
        continue;
      }
      // Campos generales que siempre se incluyen
      else if (['manufactured_by', 'description', 'type', 'style'].includes(key)) {
        filtered.attributes[key] = value;
      }
    }
  }
  
  console.log(`✅ Filtered fields for ${family}: ${Object.keys(filtered.attributes).length} relevant fields`);
  
  return filtered;
}

/**
 * Valida que un filtro tenga los campos mínimos requeridos para su tipo
 * @param {Object} filterData - Datos del filtro
 * @param {String} family - Familia del filtro
 * @returns {Object} - {valid: boolean, missing: Array, critical_missing: Array}
 */
function validateRequiredFields(filterData, family) {
  const familyUpper = String(family || '').toUpperCase();
  
  let config = null;
  for (const [type, cfg] of Object.entries(FILTER_TYPE_FIELDS)) {
    if (cfg.family_aliases.some(alias => familyUpper.includes(alias))) {
      config = cfg;
      break;
    }
  }
  
  if (!config) {
    return { valid: false, missing: [], critical_missing: ['unknown_filter_type'] };
  }
  
  const attrs = filterData.attributes || {};
  
  // Campos críticos por tipo
  const criticalByType = {
    'AIR': ['height_mm', 'outer_diameter_mm', 'air_flow_cfm'],
    'CABIN': ['height_mm', 'width_mm', 'thickness_mm'],
    'OIL': ['height_mm', 'outer_diameter_mm', 'thread_size', 'gasket_od_mm'],
    'FUEL': ['height_mm', 'flow_gph', 'micron_rating', 'water_separation_efficiency_percent'],
    'HYDRAULIC': ['height_mm', 'micron_rating', 'flow_gpm'],
    'TRANSMISSION': ['height_mm', 'micron_rating']
  };
  
  // Determinar tipo base
  let baseType = 'AIR'; // default
  if (familyUpper.includes('OIL') || familyUpper === 'OIL') baseType = 'OIL';
  else if (familyUpper.includes('FUEL') || familyUpper === 'FUEL') baseType = 'FUEL';
  else if (familyUpper.includes('CABIN')) baseType = 'CABIN';
  else if (familyUpper.includes('HYDRAULIC')) baseType = 'HYDRAULIC';
  else if (familyUpper.includes('TRANS')) baseType = 'TRANSMISSION';
  
  const criticalFields = criticalByType[baseType] || [];
  const missing = [];
  const critical_missing = [];
  
  for (const field of criticalFields) {
    if (!attrs[field] || attrs[field] === '' || attrs[field] === null) {
      missing.push(field);
      critical_missing.push(field);
    }
  }
  
  return {
    valid: critical_missing.length === 0,
    missing,
    critical_missing,
    type: baseType
  };
}

module.exports = {
  FILTER_TYPE_FIELDS,
  filterRelevantFields,
  validateRequiredFields
};
