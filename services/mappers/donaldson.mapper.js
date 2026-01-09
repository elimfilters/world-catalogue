/**
 * DONALDSON SPECIFICATIONS MAPPER
 * Mapea las especificaciones extraídas del scraper a las columnas del MASTER_UNIFIED_V5
 */

class DonaldsonMapper {
  
  /**
   * Mapea el objeto specs del scraper a las columnas del sheet
   * @param {Object} scrapedData - Datos del scraper de Donaldson
   * @returns {Object} - Objeto mapeado con todas las columnas
   */
  mapToSheet(scrapedData) {
    const specs = scrapedData.especificaciones || {};
    const descripcion = scrapedData.descripcion || '';
    
    return {
      // === IDENTIFICACIÓN ===
      input_code: scrapedData.skuBuscado || scrapedData.idReal,
      elimfilters_sku: null, // Se generará después con sku.generator
      description: descripcion,
      filter_type: this.detectFilterType(descripcion, specs),
      prefix: null, // Se asignará después
      duty: 'HD', // Donaldson es Heavy Duty por defecto
      
      // === DIMENSIONES FÍSICAS ===
      thread_size: this.extractThreadSize(specs),
      height_mm: this.extractDimension(specs, 'Height', 'mm'),
      height_inch: this.extractDimension(specs, 'Height', 'inch'),
      outer_diameter_mm: this.extractDimension(specs, ['Outside Diameter', 'Outer Diameter', 'OD'], 'mm'),
      outer_diameter_inch: this.extractDimension(specs, ['Outside Diameter', 'Outer Diameter', 'OD'], 'inch'),
      inner_diameter_mm: this.extractDimension(specs, ['Inside Diameter', 'Inner Diameter', 'ID'], 'mm'),
      gasket_od_mm: this.extractDimension(specs, ['Gasket OD', 'Gasket Outer Diameter'], 'mm'),
      gasket_od_inch: this.extractDimension(specs, ['Gasket OD', 'Gasket Outer Diameter'], 'inch'),
      gasket_id_mm: this.extractDimension(specs, ['Gasket ID', 'Gasket Inner Diameter'], 'mm'),
      gasket_id_inch: this.extractDimension(specs, ['Gasket ID', 'Gasket Inner Diameter'], 'inch'),
      
      // === ESPECIFICACIONES TÉCNICAS DE FILTRACIÓN ===
      iso_test_method: this.extractValue(specs, ['ISO Test Method', 'Test Method']),
      micron_rating: this.extractMicronRating(specs),
      beta_ratio: this.extractValue(specs, ['Beta Ratio', 'β Ratio']),
      nominal_efficiency: this.extractEfficiency(specs),
      
      // === FLUJO ===
      rated_flow_lmin: this.extractFlow(specs, 'lpm'),
      rated_flow_gpm: this.extractFlow(specs, 'gpm'),
      rated_flow_cfm: this.extractFlow(specs, 'cfm'),
      
      // === PRESIÓN ===
      max_pressure_psi: this.extractPressure(specs, ['Max Pressure', 'Maximum Pressure']),
      burst_pressure_psi: this.extractPressure(specs, ['Burst Pressure']),
      collapse_pressure_psi: this.extractPressure(specs, ['Collapse Pressure']),
      bypass_valve_pressure_psi: this.extractPressure(specs, ['Bypass Pressure', 'Relief Valve']),
      
      // === MATERIALES ===
      media_type: this.extractValue(specs, ['Media Type', 'Filter Media', 'Media']),
      seal_material: this.extractValue(specs, ['Seal Material', 'Gasket Material', 'Seal']),
      housing_material: this.extractValue(specs, ['Housing Material', 'Can Material']),
      end_cap_material: this.extractValue(specs, ['End Cap Material', 'End Cap']),
      
      // === CARACTERÍSTICAS ADICIONALES ===
      anti_drainback_valve: this.extractBoolean(specs, ['Anti-Drainback Valve', 'ADBV', 'Anti Drainback']),
      dirt_holding_capacity_g: this.extractDirtCapacity(specs),
      service_life_hours: this.extractValue(specs, ['Service Life', 'Life Hours']),
      change_interval_km: this.extractValue(specs, ['Change Interval', 'Service Interval']),
      operating_temp_min_c: this.extractTemperature(specs, 'min'),
      operating_temp_max_c: this.extractTemperature(specs, 'max'),
      fluid_compatibility: this.extractValue(specs, ['Fluid Compatibility', 'Compatible Fluids']),
      biodiesel_compatible: this.extractBoolean(specs, ['Biodiesel Compatible', 'Biodiesel']),
      filtration_technology: this.extractValue(specs, ['Filtration Technology', 'Technology']),
      special_features: this.extractSpecialFeatures(specs, descripcion),
      
      // === APLICACIONES Y REFERENCIAS ===
      application: this.extractApplications(descripcion, specs),
      oem_codes: this.extractOEMCodes(scrapedData.alternativos),
      cross_reference_codes: this.extractCrossReferences(scrapedData.alternativos),
      equipment_applications: this.extractEquipmentApplications(specs),
      engine_applications: this.extractValue(specs, ['Engine Application', 'Engine']),
      equipment_year: null, // No disponible en Donaldson
      qty_required: this.extractValue(specs, ['Quantity Required', 'Qty']),
      
      // === CONTROL Y CALIDAD ===
      tier_system: 'STANDARD', // Por defecto, se ajustará con TRILOGY
      em9_flag: 'No', // Se define al final
      et9_flag: 'No', // Se define al final
      special_conditions: null,
      stock_status: 'Available',
      warranty: '1 Year',
      operating_cost_per_hour: null, // Requiere cálculo
      
      // === DOCUMENTACIÓN ===
      technical_sheet_url: scrapedData.urlFinal,
      url_technical_sheet_pdf: null,
      audit_status: 'Pending',
      audit_status_38_0: null,
      
      // === METADATA ===
      scraped_at: scrapedData.timestamp || new Date().toISOString(),
      scraper_version: scrapedData.v || 'unknown',
      data_source: 'Donaldson Scraper',
      specs_count: scrapedData.cantidadEspecificaciones || 0,
      alternates_count: scrapedData.cantidadAlternativos || 0
    };
  }
  
  // ==================== MÉTODOS DE EXTRACCIÓN ====================
  
  /**
   * Detecta el tipo de filtro basado en descripción y specs
   */
  detectFilterType(description, specs) {
    const desc = description.toLowerCase();
    const specsStr = JSON.stringify(specs).toLowerCase();
    const combined = desc + ' ' + specsStr;
    
    if (combined.includes('oil') || combined.includes('lube')) return 'Lube';
    if (combined.includes('fuel') && !combined.includes('separator')) return 'Fuel';
    if (combined.includes('air') && !combined.includes('cabin')) return 'Air';
    if (combined.includes('cabin') || combined.includes('hvac')) return 'Cabin';
    if (combined.includes('hydraulic')) return 'Hydraulic';
    if (combined.includes('coolant')) return 'Coolant';
    if (combined.includes('separator')) return 'Fuel Separator';
    
    return 'Unknown';
  }
  
  /**
   * Extrae dimensiones con manejo de múltiples unidades
   */
  extractDimension(specs, keys, targetUnit) {
    if (!Array.isArray(keys)) keys = [keys];
    
    for (const key of keys) {
      const value = specs[key];
      if (!value) continue;
      
      // Extraer número con unidad
      const match = value.match(/([\d.]+)\s*(mm|in|inch|"|cm)?/i);
      if (!match) continue;
      
      const number = parseFloat(match[1]);
      const unit = match[2]?.toLowerCase();
      
      // Convertir a unidad objetivo
      if (targetUnit === 'mm') {
        if (unit === 'in' || unit === 'inch' || unit === '"') {
          return (number * 25.4).toFixed(2);
        }
        if (unit === 'cm') {
          return (number * 10).toFixed(2);
        }
        return number.toFixed(2);
      }
      
      if (targetUnit === 'inch') {
        if (unit === 'mm') {
          return (number / 25.4).toFixed(3);
        }
        if (unit === 'cm') {
          return (number / 2.54).toFixed(3);
        }
        return number.toFixed(3);
      }
    }
    
    return null;
  }
  
  /**
   * Extrae thread size (rosca)
   */
  extractThreadSize(specs) {
    const threadKeys = ['Thread', 'Thread Size', 'Connection', 'Port Size'];
    for (const key of threadKeys) {
      if (specs[key]) return specs[key];
    }
    return null;
  }
  
  /**
   * Extrae micron rating
   */
  extractMicronRating(specs) {
    const micronKeys = ['Micron Rating', 'Micron', 'Filtration Rating', 'Rating'];
    for (const key of micronKeys) {
      const value = specs[key];
      if (value) {
        const match = value.match(/(\d+)\s*micron/i);
        return match ? match[1] : value;
      }
    }
    return null;
  }
  
  /**
   * Extrae eficiencia
   */
  extractEfficiency(specs) {
    const effKeys = ['Efficiency', 'Nominal Efficiency', 'Filtration Efficiency'];
    for (const key of effKeys) {
      const value = specs[key];
      if (value) {
        const match = value.match(/([\d.]+)\s*%/);
        return match ? parseFloat(match[1]) : null;
      }
    }
    return null;
  }
  
  /**
   * Extrae flujo según unidad
   */
  extractFlow(specs, unit) {
    const flowKeys = ['Flow Rate', 'Rated Flow', 'Flow', 'Max Flow'];
    for (const key of flowKeys) {
      const value = specs[key];
      if (!value) continue;
      
      const lowerValue = value.toLowerCase();
      if (unit === 'lpm' && (lowerValue.includes('lpm') || lowerValue.includes('l/min'))) {
        const match = value.match(/([\d.]+)/);
        return match ? parseFloat(match[1]) : null;
      }
      if (unit === 'gpm' && lowerValue.includes('gpm')) {
        const match = value.match(/([\d.]+)/);
        return match ? parseFloat(match[1]) : null;
      }
      if (unit === 'cfm' && lowerValue.includes('cfm')) {
        const match = value.match(/([\d.]+)/);
        return match ? parseFloat(match[1]) : null;
      }
    }
    return null;
  }
  
  /**
   * Extrae presión
   */
  extractPressure(specs, keys) {
    if (!Array.isArray(keys)) keys = [keys];
    
    for (const key of keys) {
      const value = specs[key];
      if (value) {
        const match = value.match(/([\d.]+)\s*psi/i);
        return match ? parseFloat(match[1]) : null;
      }
    }
    return null;
  }
  
  /**
   * Extrae temperatura
   */
  extractTemperature(specs, type) {
    const tempKeys = [
      'Operating Temperature',
      'Temperature Range',
      'Temp Range',
      'Service Temperature'
    ];
    
    for (const key of tempKeys) {
      const value = specs[key];
      if (!value) continue;
      
      // Buscar rango: -40°C to 120°C
      const rangeMatch = value.match(/(-?\d+)\s*°?[CF]?\s*to\s*(-?\d+)\s*°?[CF]?/i);
      if (rangeMatch) {
        const min = parseInt(rangeMatch[1]);
        const max = parseInt(rangeMatch[2]);
        return type === 'min' ? min : max;
      }
      
      // Buscar temperatura simple
      const match = value.match(/(-?\d+)\s*°?C/i);
      if (match) return parseInt(match[1]);
    }
    
    return null;
  }
  
  /**
   * Extrae capacidad de retención de suciedad
   */
  extractDirtCapacity(specs) {
    const keys = ['Dirt Holding Capacity', 'Dirt Capacity', 'DHC'];
    for (const key of keys) {
      const value = specs[key];
      if (value) {
        const match = value.match(/([\d.]+)\s*(g|gram)/i);
        return match ? parseFloat(match[1]) : null;
      }
    }
    return null;
  }
  
  /**
   * Extrae valor booleano
   */
  extractBoolean(specs, keys) {
    if (!Array.isArray(keys)) keys = [keys];
    
    for (const key of keys) {
      const value = specs[key];
      if (!value) continue;
      
      const lower = value.toLowerCase();
      if (lower.includes('yes') || lower.includes('included') || lower.includes('standard')) {
        return 'Yes';
      }
      if (lower.includes('no') || lower.includes('not included') || lower.includes('optional')) {
        return 'No';
      }
    }
    return 'Unknown';
  }
  
  /**
   * Extrae valor genérico
   */
  extractValue(specs, keys) {
    if (!Array.isArray(keys)) keys = [keys];
    
    for (const key of keys) {
      if (specs[key]) return specs[key];
    }
    return null;
  }
  
  /**
   * Extrae características especiales
   */
  extractSpecialFeatures(specs, description) {
    const features = [];
    
    const featureKeys = [
      'Special Features',
      'Features',
      'Additional Features',
      'Technology'
    ];
    
    for (const key of featureKeys) {
      if (specs[key]) features.push(specs[key]);
    }
    
    // Detectar en descripción
    if (description.toLowerCase().includes('synthetic')) features.push('Synthetic Media');
    if (description.toLowerCase().includes('premium')) features.push('Premium Grade');
    if (description.toLowerCase().includes('heavy duty')) features.push('Heavy Duty');
    
    return features.length > 0 ? features.join(', ') : null;
  }
  
  /**
   * Extrae aplicaciones
   */
  extractApplications(description, specs) {
    const appKeys = ['Application', 'Applications', 'Use'];
    for (const key of appKeys) {
      if (specs[key]) return specs[key];
    }
    
    // Detectar en descripción
    const apps = [];
    if (description.toLowerCase().includes('caterpillar')) apps.push('Caterpillar Equipment');
    if (description.toLowerCase().includes('john deere')) apps.push('John Deere Equipment');
    if (description.toLowerCase().includes('komatsu')) apps.push('Komatsu Equipment');
    
    return apps.length > 0 ? apps.join(', ') : null;
  }
  
  /**
   * Extrae códigos OEM
   */
  extractOEMCodes(alternativos) {
    if (!alternativos || alternativos.length === 0) return null;
    
    // OEM codes suelen ser los primeros en la lista
    const oemCodes = alternativos.slice(0, 5);
    return oemCodes.join(', ');
  }
  
  /**
   * Extrae cross references
   */
  extractCrossReferences(alternativos) {
    if (!alternativos || alternativos.length === 0) return null;
    
    // Todos los alternativos son cross references
    return alternativos.join(', ');
  }
  
  /**
   * Extrae aplicaciones de equipo
   */
  extractEquipmentApplications(specs) {
    const keys = [
      'Equipment',
      'Equipment Application',
      'Fits',
      'Compatible Equipment'
    ];
    
    for (const key of keys) {
      if (specs[key]) return specs[key];
    }
    
    return null;
  }
}

module.exports = new DonaldsonMapper();
