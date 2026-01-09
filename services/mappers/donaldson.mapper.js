const prefixesConfig = require('../../config/elimfilters.prefixes.json');

/**
 * DONALDSON MAPPER
 * Mapea especificaciones de Donaldson a las columnas del MASTER_UNIFIED_V5
 */
class DonaldsonMapper {
  
  static mapToSheet(specs, donaldsonSKU, alternatives = {}) {
    
    // Detectar tipo de filtro basado en el SKU
    const type = this.detectFilterType(donaldsonSKU, specs);
    const prefix = prefixesConfig.prefixes[type] || prefixesConfig.defaultPrefix;

    return {
      // === COLUMNAS BÁSICAS ===
      competitorSKU: donaldsonSKU,
      competitorBrand: 'DONALDSON',
      elimfiltersType: type,
      elimfiltersPrefix: prefix,
      
      // === DIMENSIONES (Height, OD, ID, etc.) ===
      filterHeight: specs['Height'] || specs['Overall Height'] || null,
      filterOuterDiameter: specs['Outer Diameter'] || specs['OD'] || null,
      filterInnerDiameter: specs['Inner Diameter'] || specs['ID'] || null,
      filterGasketOD: specs['Gasket OD'] || null,
      filterGasketID: specs['Gasket ID'] || null,
      filterThreadSize: specs['Thread Size'] || null,
      
      // === ESPECIFICACIONES TÉCNICAS ===
      filterMicronRating: specs['Micron Rating'] || specs['Filtration Rating'] || null,
      filterEfficiency: specs['Efficiency'] || null,
      filterBetaRatio: specs['Beta Ratio'] || null,
      filterMediaType: specs['Media Type'] || specs['Filter Media'] || null,
      filterMediaArea: specs['Media Area'] || null,
      
      // === PRESIONES ===
      filterMaxPressure: specs['Maximum Pressure'] || specs['Max Operating Pressure'] || null,
      filterBurstPressure: specs['Burst Pressure'] || null,
      filterCollapsePressure: specs['Collapse Pressure'] || null,
      filterBypassPressure: specs['Bypass Pressure'] || specs['Bypass Setting'] || null,
      
      // === MATERIALES ===
      filterSealMaterial: specs['Seal Material'] || specs['Gasket Material'] || null,
      filterHousingMaterial: specs['Housing Material'] || specs['Case Material'] || null,
      filterEndCapMaterial: specs['End Cap Material'] || null,
      
      // === FLUJOS Y CAPACIDADES ===
      filterFlowRate: specs['Flow Rate'] || specs['Rated Flow'] || null,
      filterDirtHoldingCapacity: specs['Dirt Holding Capacity'] || null,
      
      // === TEMPERATURAS ===
      filterMaxTemp: specs['Maximum Temperature'] || specs['Max Temp'] || null,
      filterMinTemp: specs['Minimum Temperature'] || specs['Min Temp'] || null,
      
      // === REFERENCIAS CRUZADAS ===
      crossReferenceBaldwin: alternatives.baldwin || null,
      crossReferenceWix: alternatives.wix || null,
      crossReferenceFram: alternatives.fram || null,
      crossReferenceFleetguard: alternatives.fleetguard || null,
      crossReferenceMann: alternatives.mann || null,
      
      // === APLICACIONES ===
      equipmentApplications: specs['Applications'] || null,
      industryApplications: specs['Industry'] || null,
      
      // === METADATA ===
      filterWeight: specs['Weight'] || null,
      filterPartNumber: donaldsonSKU,
      filterDescription: this.generateDescription(type, specs),
      
      // === TRILOGY VARIANTS ===
      trilogyEnabled: prefixesConfig.trilogy.enabled,
      trilogyVariants: prefixesConfig.trilogy.enabled ? 
        prefixesConfig.trilogy.variants.join(',') : null
    };
  }
  
  static detectFilterType(sku, specs) {
    const skuUpper = sku.toUpperCase();
    const description = (specs['Description'] || '').toUpperCase();
    
    if (skuUpper.startsWith('P') || description.includes('OIL') || description.includes('LUBE')) {
      return 'OIL';
    }
    if (skuUpper.startsWith('B') || description.includes('FUEL')) {
      return 'FUEL';
    }
    if (skuUpper.startsWith('C') || description.includes('AIR')) {
      return 'AIR';
    }
    if (skuUpper.startsWith('H') || description.includes('HYDRAULIC')) {
      return 'HYDRAULIC';
    }
    
    return 'OIL'; // Default
  }
  
  static generateDescription(type, specs) {
    const height = specs['Height'] || '';
    const od = specs['Outer Diameter'] || '';
    const micron = specs['Micron Rating'] || '';
    
    return `ELIMFILTERS ${type} Filter - ${height} H x ${od} OD - ${micron} Micron`.trim();
  }
}

module.exports = DonaldsonMapper;

