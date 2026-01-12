const { TURBINE_CATALOG, SKU_INDEX, TURBINE_TECHNOLOGY } = require('../config/turbineCatalog');
const { getRacorEquivalents } = require('../utils/turbineDetector');

function getTurbineProduct(elimSku, originalCode = null) {
  const skuInfo = SKU_INDEX[elimSku];
  if (!skuInfo) return { success: false, error: 'turbine_not_found', message: 'SKU no encontrado', input_code: originalCode || elimSku };
  
  const turbineData = TURBINE_CATALOG[skuInfo.model];
  
  if (skuInfo.type === 'housing') {
    return {
      success: true, filter_type: 'turbine_housing', brand: TURBINE_TECHNOLOGY.brand, prefix: 'ET9',
      input_code: originalCode || elimSku, detected_as: 'turbine',
      product: { sku: elimSku, type: 'housing', model: skuInfo.model, ...turbineData.housing },
      compatible_cartridges: turbineData.cartridges.map(c => ({ sku: c.sku, micron: c.micron_rating, description: c.description })),
      racor_equivalents: getRacorEquivalents(elimSku)
    };
  }
  
  if (skuInfo.type === 'cartridge') {
    const cartridge = turbineData.cartridges.find(c => c.sku === elimSku);
    return {
      success: true, filter_type: 'turbine_cartridge', brand: TURBINE_TECHNOLOGY.brand, prefix: 'ET9',
      input_code: originalCode || elimSku, detected_as: 'turbine',
      product: { sku: elimSku, type: 'cartridge', model: skuInfo.model, ...cartridge },
      compatible_housing: { sku: turbineData.housing.sku, model: skuInfo.model },
      other_micron_options: turbineData.cartridges.filter(c => c.sku !== elimSku).map(c => ({ sku: c.sku, micron: c.micron_rating })),
      racor_equivalents: getRacorEquivalents(elimSku)
    };
  }
  
  return { success: false, error: 'unknown_type' };
}

module.exports = { getTurbineProduct };
