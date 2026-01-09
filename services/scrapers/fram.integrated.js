const { scrapeFRAM } = require('./fram.scraper');
const framMapper = require('../mappers/fram.mapper');
const skuGenerator = require('../sku.generator');

/**
 * FRAM WRAPPER INTEGRADO
 * Une el scraper original con el mapper de 47 columnas
 */
async function scrapeFRAMIntegrated(framSKU) {
  try {
    console.log('[FRAM INTEGRATED] Scraping:', framSKU);
    
    // 1. Usar el scraper original que YA FUNCIONA
    const scrapedData = await scrapeFRAM(framSKU);
    
    if (!scrapedData.success) {
      throw new Error(scrapedData.error || 'Scraping failed');
    }
    
    // 2. Mapear a las 47 columnas usando el mapper
    const mappedData = framMapper.mapToSheet(scrapedData, framSKU);
    
    // 3. Generar SKU ELIMFILTERS
    const elimfiltersData = await skuGenerator.generate(framSKU, mappedData.elimfiltersType || "OIL", "STANDARD");
    
    // 4. Combinar todo
    const result = {
      ...mappedData,
      ...elimfiltersData,
      // Preservar datos originales
      originalData: scrapedData,
      source: 'FRAM_INTEGRATED',
      scrapedAt: new Date().toISOString()
    };
    
    console.log('[FRAM INTEGRATED] ✅ Success:', result.elimfiltersSKU);
    return result;
    
  } catch (error) {
    console.error('[FRAM INTEGRATED] ❌ Error:', error.message);
    throw error;
  }
}

module.exports = scrapeFRAMIntegrated;

