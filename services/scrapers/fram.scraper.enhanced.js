const axios = require('axios');
const cheerio = require('cheerio');
const framMapper = require('../mappers/fram.mapper');
const skuGenerator = require('../sku.generator');

/**
 * FRAM SCRAPER ENHANCED
 * Scraper mejorado que mapea datos de FRAM a las columnas del MASTER_UNIFIED_V5
 */
async function scrapeFRAMEnhanced(framSKU) {
  try {
    const url = `https://www.fram.com/products/${framSKU}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const data = {};

    // Extraer aplicaciones de vehículos
    const applications = [];
    $('.vehicle-application').each((i, elem) => {
      applications.push($(elem).text().trim());
    });
    data.applications = applications;

    // Extraer cross references
    const crossRefs = [];
    $('.cross-reference').each((i, elem) => {
      crossRefs.push($(elem).text().trim());
    });
    data.crossReferences = crossRefs;

    // Extraer especificaciones
    $('.specifications td').each((i, elem) => {
      const text = $(elem).text().trim();
      if (text.includes('Height')) data.height = text;
      if (text.includes('Diameter')) data.diameter = text;
    });

    // Mapear datos a columnas del sheet
    const mappedData = framMapper.mapToSheet(data, framSKU);

    // Generar SKU ELIMFILTERS
    const elimfiltersData = await skuGenerator.generate({
      competitorSKU: framSKU,
      type: mappedData.elimfiltersType || 'OIL',
      duty: 'LIGHT'
    });

    // Combinar todo
    const result = {
      ...mappedData,
      ...elimfiltersData,
      source: 'FRAM_ENHANCED',
      scrapedAt: new Date().toISOString()
    };

    return result;

  } catch (error) {
    console.error('Error scraping FRAM:', error.message);
    throw error;
  }
}

module.exports = scrapeFRAMEnhanced;

