const prefixesConfig = require('../../config/elimfilters.prefixes.json');

/**
 * FRAM MAPPER
 * Mapea datos de FRAM a las columnas del MASTER_UNIFIED_V5
 */
class FRAMMapper {
  
  static mapToSheet(data, framSKU) {
    
    // Detectar tipo de filtro
    const type = this.detectFilterType(framSKU);
    const prefix = prefixesConfig.prefixes[type] || prefixesConfig.defaultPrefix;

    return {
      // === COLUMNAS BÁSICAS ===
      competitorSKU: framSKU,
      competitorBrand: 'FRAM',
      elimfiltersType: type,
      elimfiltersPrefix: prefix,
      
      // === DIMENSIONES ===
      filterHeight: data.height || null,
      filterOuterDiameter: data.diameter || null,
      filterInnerDiameter: null,
      filterThreadSize: data.threadSize || null,
      
      // === APLICACIONES DE VEHÍCULOS (100+) ===
      vehicleApplications: data.applications ? data.applications.slice(0, 100).join('; ') : null,
      totalVehicleApplications: data.applications ? data.applications.length : 0,
      
      // === CROSS REFERENCES (100+) ===
      crossReferences: data.crossReferences ? data.crossReferences.slice(0, 100).join('; ') : null,
      totalCrossReferences: data.crossReferences ? data.crossReferences.length : 0,
      
      // === EQUIPMENT APPLICATIONS ===
      equipmentApplications: data.equipmentApps ? data.equipmentApps.join('; ') : null,
      
      // === ENGINE APPLICATIONS ===
      engineApplications: data.engineApps ? data.engineApps.join('; ') : null,
      
      // === EQUIPMENT YEAR RANGE ===
      equipmentYearStart: data.yearStart || null,
      equipmentYearEnd: data.yearEnd || null,
      equipmentYearRange: data.yearStart && data.yearEnd ? 
        `${data.yearStart}-${data.yearEnd}` : null,
      
      // === ESPECIFICACIONES ===
      filterMicronRating: data.micronRating || null,
      filterMediaType: data.mediaType || 'Cellulose',
      filterAntiDrainbackValve: data.hasAntiDrainback || null,
      filterBypassValve: data.hasBypass || null,
      
      // === METADATA ===
      filterPartNumber: framSKU,
      filterDescription: this.generateDescription(type, framSKU, data),
      
      // === TRILOGY VARIANTS ===
      trilogyEnabled: prefixesConfig.trilogy.enabled,
      trilogyVariants: prefixesConfig.trilogy.enabled ? 
        prefixesConfig.trilogy.variants.join(',') : null,
      
      // === DATOS ADICIONALES ===
      lightDutyOptimized: true,
      targetMarket: 'AUTOMOTIVE',
      distributionChannel: 'AFTERMARKET'
    };
  }
  
  static detectFilterType(sku) {
    const skuUpper = sku.toUpperCase();
    
    if (skuUpper.startsWith('PH') || skuUpper.startsWith('XG')) {
      return 'OIL';
    }
    if (skuUpper.startsWith('CA') || skuUpper.startsWith('CA')) {
      return 'AIR';
    }
    if (skuUpper.startsWith('G') || skuUpper.startsWith('PS')) {
      return 'FUEL';
    }
    if (skuUpper.startsWith('CF')) {
      return 'CABIN';
    }
    
    return 'OIL'; // Default
  }
  
  static generateDescription(type, sku, data) {
    const apps = data.applications ? data.applications.length : 0;
    return `ELIMFILTERS ${type} Filter ${sku} - Compatible with ${apps}+ vehicles`;
  }
}

module.exports = FRAMMapper;


