const { searchInSheets } = require('./googleSheets.service');
const { searchInMongoDB } = require('./mongodb.service');
const scrapeDonaldsonEnhanced = require('./scrapers/donaldson.scraper.enhanced');
const scrapeFRAMEnhanced = require('./scrapers/fram.scraper.enhanced');

/**
 * FILTER ORCHESTRATOR ENHANCED - VERSION SIMPLIFICADA
 * Detecta duty basado en el SKU pattern sin usar GROQ
 */
function detectDutySimple(competitorSKU) {
  const sku = competitorSKU.toUpperCase();
  
  // Donaldson patterns (HEAVY)
  if (sku.startsWith('P') || sku.startsWith('B') || sku.startsWith('C') || sku.startsWith('H')) {
    return 'HEAVY';
  }
  
  // FRAM patterns (LIGHT)
  if (sku.startsWith('PH') || sku.startsWith('CA') || sku.startsWith('G') || sku.startsWith('XG')) {
    return 'LIGHT';
  }
  
  return 'HEAVY'; // Default
}

async function filterOrchestratorEnhanced(competitorSKU) {
  try {
    console.log(`[ORCHESTRATOR] Buscando: ${competitorSKU}`);

    // 1. Buscar en Google Sheets
    try {
      const sheetResult = await searchInSheets(competitorSKU);
      if (sheetResult && sheetResult.found) {
        console.log('[ORCHESTRATOR] ✅ Encontrado en Google Sheets');
        return { ...sheetResult, source: 'GOOGLE_SHEETS' };
      }
    } catch (e) {
      console.log('[ORCHESTRATOR] Google Sheets no disponible');
    }

    // 2. Buscar en MongoDB
    try {
      const mongoResult = await searchInMongoDB(competitorSKU);
      if (mongoResult && mongoResult.found) {
        console.log('[ORCHESTRATOR] ✅ Encontrado en MongoDB');
        return { ...mongoResult, source: 'MONGODB' };
      }
    } catch (e) {
      console.log('[ORCHESTRATOR] MongoDB no disponible');
    }

    // 3. Detectar duty para saber qué scraper usar
    const duty = detectDutySimple(competitorSKU);
    console.log(`[ORCHESTRATOR] Duty detectado: ${duty}`);

    // 4. Scrapear según el duty
    let scrapedData;
    if (duty === 'HEAVY') {
      console.log('[ORCHESTRATOR] 🔍 Scraping Donaldson...');
      scrapedData = await scrapeDonaldsonEnhanced(competitorSKU);
    } else {
      console.log('[ORCHESTRATOR] 🔍 Scraping FRAM...');
      scrapedData = await scrapeFRAMEnhanced(competitorSKU);
    }

    console.log(`[ORCHESTRATOR] ✅ Scraping completado: ${scrapedData.elimfiltersSKU}`);
    return scrapedData;

  } catch (error) {
    console.error('[ORCHESTRATOR] ❌ Error:', error.message);
    throw error;
  }
}

module.exports = filterOrchestratorEnhanced;
