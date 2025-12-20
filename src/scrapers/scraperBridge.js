const prefixMap = require('../config/prefixMap');

/**
 * Scrape data by part number
 * @param {string} partNumber - The part number to search
 * @returns {Promise<Object>} - Scraped data
 */
async function scrapeByPartNumber(partNumber) {
  console.log(`🌉 [BRIDGE] Processing part number: ${partNumber}`);

  if (!partNumber || typeof partNumber !== 'string') {
    throw new Error('Invalid part number provided');
  }

  const cleanPartNumber = partNumber.trim().toUpperCase();

  try {
    // Resolver brand, family, duty usando prefixMap
    const { brand, family, duty } = prefixMap.resolveBrandFamilyDutyByPrefix(cleanPartNumber);

    // Simular datos (reemplaza con tu lógica real de scraping)
    const scrapedData = {
      sku: cleanPartNumber,
      brand: brand,
      family: family,
      duty: duty,
      description: `${duty} Duty Filtration System`,
      specifications: {
        threadSize: 'TBD',
        gasketOD: 'TBD',
        length: 'TBD',
        cloudSync: 'ACTIVE'
      },
      status: 'available',
      timestamp: new Date().toISOString()
    };

    console.log(`✅ [BRIDGE] Successfully scraped data for ${cleanPartNumber}`);
    return scrapedData;

  } catch (error) {
    console.error(`❌ [BRIDGE] Error scraping ${cleanPartNumber}:`, error.message);
    throw new Error(`Scraping failed: ${error.message}`);
  }
}

module.exports = { 
  scrapeByPartNumber 
};
