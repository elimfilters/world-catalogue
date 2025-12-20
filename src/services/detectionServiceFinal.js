const scraperBridge = require('../scrapers/scraperBridge');

/**
 * Detect and retrieve part number data
 * @param {string} partNumber - The part number to detect
 * @returns {Promise<Object>} - Detection result
 */
async function detectPartNumber(partNumber) {
  if (!partNumber || typeof partNumber !== 'string') {
    throw new Error('Invalid part number: must be a non-empty string');
  }

  const cleanPartNumber = partNumber.trim();
  
  if (cleanPartNumber.length === 0) {
    throw new Error('Part number cannot be empty');
  }

  console.log(`🔎 [DETECTION] Starting detection for: ${cleanPartNumber}`);

  try {
    // Llamar al scraper bridge
    const result = await scraperBridge.scrapeByPartNumber(cleanPartNumber);
    
    if (!result || !result.sku) {
      throw new Error('No data found for this part number');
    }

    // Validar calidad de datos
    const dataQuality = assessDataQuality(result);
    
    console.log(`✅ [DETECTION] Found data for ${cleanPartNumber} (Quality: ${dataQuality})`);
    
    return {
      ...result,
      dataQuality: dataQuality,
      detectedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`❌ [DETECTION] Failed for ${cleanPartNumber}:`, error.message);
    throw error;
  }
}

/**
 * Assess data quality
 * @param {Object} data - The data to assess
 * @returns {string} - Quality level
 */
function assessDataQuality(data) {
  if (!data) return 'NONE';
  
  const hasBasicInfo = data.sku && data.brand;
  const hasSpecs = data.specifications && Object.keys(data.specifications).length > 0;
  const hasDescription = data.description && data.description.length > 0;
  
  if (hasBasicInfo && hasSpecs && hasDescription) return 'EXCELLENT';
  if (hasBasicInfo && hasSpecs) return 'GOOD';
  if (hasBasicInfo) return 'PARTIAL';
  return 'MINIMAL';
}

module.exports = { 
  detectPartNumber 
};
