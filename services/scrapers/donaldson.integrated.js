const donaldsonScraperOriginal = require('./donaldson.scraper');
const donaldsonMapper = require('../mappers/donaldson.mapper');
const skuGenerator = require('../sku.generator');

/**
 * DONALDSON WRAPPER INTEGRADO
 * Une el scraper original con el mapper de 47 columnas
 */
async function scrapeDonaldsonIntegrated(donaldsonSKU) {
  try {
    console.log('[DONALDSON INTEGRATED] Scraping:', donaldsonSKU);
    
    // 1. Usar el scraper original que YA FUNCIONA
    const scrapedData = await donaldsonScraperOriginal(donaldsonSKU);
    
    if (scrapedData.error) {
      throw new Error(scrapedData.message);
    }
    
    // 2. Mapear a las 47 columnas usando el mapper
    const mappedData = donaldsonMapper.mapToSheet(
      scrapedData.specs || {},
      donaldsonSKU,
      {
        baldwin: scrapedData.alternativos?.find(a => a.includes('BALDWIN')),
        wix: scrapedData.alternativos?.find(a => a.includes('WIX')),
        fram: scrapedData.alternativos?.find(a => a.includes('FRAM')),
        fleetguard: scrapedData.alternativos?.find(a => a.includes('FLEETGUARD')),
        mann: scrapedData.alternativos?.find(a => a.includes('MANN'))
      }
    );
    
    // 3. Generar SKU ELIMFILTERS
    const elimfiltersData = await skuGenerator.generate({
      competitorSKU: donaldsonSKU,
      type: mappedData.elimfiltersType || 'OIL',
      duty: 'HEAVY'
    });
    
    // 4. Combinar todo
    const result = {
      ...mappedData,
      ...elimfiltersData,
      // Preservar datos originales
      originalSpecs: scrapedData.specs,
      originalAlternativos: scrapedData.alternativos,
      source: 'DONALDSON_INTEGRATED',
      scrapedAt: new Date().toISOString()
    };
    
    console.log('[DONALDSON INTEGRATED] ✅ Success:', result.elimfiltersSKU);
    return result;
    
  } catch (error) {
    console.error('[DONALDSON INTEGRATED] ❌ Error:', error.message);
    throw error;
  }
}

module.exports = scrapeDonaldsonIntegrated;
