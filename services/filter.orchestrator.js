const { searchInSheets } = require('./googleSheets.service');
const { searchInMongoDB } = require('./mongodb.service');
const { detectDuty } = require('./duty.detector');
const { scrapeDonaldson } = require('./scrapers/donaldson.scraper');
const { scrapeFRAM } = require('./scrapers/fram.scraper');

async function processFilterRequest(code) {
  console.log(`\n🔍 Procesando código: ${code}`);
  
  // PASO 1: Buscar en Google Sheets
  console.log('📊 Buscando en Google Sheets...');
  const sheetsResult = await searchInSheets(code);
  if (sheetsResult.success) {
    console.log('✅ Encontrado en Google Sheets');
    return {
      success: true,
      source: 'cache_sheets',
      data: sheetsResult.data
    };
  }
  
  // PASO 2: Buscar en MongoDB
  console.log('📊 Buscando en MongoDB...');
  const mongoResult = await searchInMongoDB(code);
  if (mongoResult.success) {
    console.log('✅ Encontrado en MongoDB');
    return {
      success: true,
      source: 'cache_mongodb',
      data: mongoResult.data
    };
  }
  
  // PASO 3: No está en caché, hacer scraping
  console.log('🌐 No encontrado en caché, iniciando scraping...');
  
  // PASO 3a: Detectar DUTY
  console.log('🤖 Detectando DUTY...');
  const dutyResult = await detectDuty(code);
  console.log(`✅ DUTY detectado: ${dutyResult.duty} (${dutyResult.confidence} confidence)`);
  
  // PASO 3b: Scraping según DUTY
  if (dutyResult.duty === 'HD') {
    console.log('🔧 Usando scraper Donaldson (HD)...');
    const scrapedResult = await scrapeDonaldson(code);
    
    if (scrapedResult.success) {
      return {
        success: true,
        source: 'scraped_donaldson',
        duty: dutyResult,
        data: scrapedResult.data,
        productUrl: scrapedResult.productUrl
      };
    }
  } else if (dutyResult.duty === 'LD') {
    console.log('🔧 Usando scraper FRAM (LD)...');
    const scrapedResult = await scrapeFRAM(code);
    
    if (scrapedResult.success) {
      return {
        success: true,
        source: 'scraped_fram',
        duty: dutyResult,
        data: scrapedResult.data,
        productUrl: scrapedResult.productUrl
      };
    }
  }
  
  return {
    success: false,
    error: 'No data found',
    duty: dutyResult
  };
}

module.exports = { processFilterRequest };