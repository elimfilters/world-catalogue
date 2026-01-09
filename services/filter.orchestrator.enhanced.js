const { searchInSheets } = require('./googleSheets.service');
const { searchInMongoDB } = require('./mongodb.service');
const { detectDuty } = require('./duty.detector');
const scrapeDonaldsonEnhanced = require('./scrapers/donaldson.scraper.enhanced');
const scrapeFRAMEnhanced = require('./scrapers/fram.scraper.enhanced');

/**
 * FILTER ORCHESTRATOR ENHANCED
 * Versión mejorada que procesa y mapea datos a MASTER_UNIFIED_V5
 */
async function processFilterRequestEnhanced(code, options = {}) {
  console.log(`\n🔍 ====== PROCESANDO CÓDIGO: ${code} ======`);
  
  const startTime = Date.now();
  
  try {
    // === PASO 1: BUSCAR EN GOOGLE SHEETS ===
    if (options.skipCache !== true) {
      console.log('📊 Paso 1/4: Buscando en Google Sheets...');
      const sheetsResult = await searchInSheets(code);
      
      if (sheetsResult.success) {
        console.log('✅ Encontrado en Google Sheets (CACHE HIT)');
        return {
          success: true,
          source: 'cache_sheets',
          data: sheetsResult.data,
          cached: true,
          processingTime: Date.now() - startTime
        };
      }
      console.log('   ℹ️  No encontrado en Sheets');
    }
    
    // === PASO 2: BUSCAR EN MONGODB ===
    if (options.skipCache !== true) {
      console.log('📊 Paso 2/4: Buscando en MongoDB...');
      const mongoResult = await searchInMongoDB(code);
      
      if (mongoResult.success) {
        console.log('✅ Encontrado en MongoDB (CACHE HIT)');
        return {
          success: true,
          source: 'cache_mongodb',
          data: mongoResult.data,
          cached: true,
          processingTime: Date.now() - startTime
        };
      }
      console.log('   ℹ️  No encontrado en MongoDB');
    }
    
    // === PASO 3: DETECTAR DUTY ===
    console.log('🤖 Paso 3/4: Detectando DUTY...');
    const dutyResult = await detectDuty(code, options.manufacturer);
    console.log(`   ✅ DUTY: ${dutyResult.duty} (${dutyResult.confidence} confidence)`);
    console.log(`   📌 Razón: ${dutyResult.reason}`);
    
    // === PASO 4: SCRAPING SEGÚN DUTY ===
    console.log('🌐 Paso 4/4: Iniciando scraping...');
    
    let scrapedResult;
    
    if (dutyResult.duty === 'HD') {
      console.log('   🔧 Usando scraper DONALDSON (Heavy Duty)...');
      scrapedResult = await scrapeDonaldsonEnhanced(code);
      
      if (scrapedResult.success) {
        return {
          success: true,
          source: 'scraped_donaldson_enhanced',
          duty: dutyResult,
          
          // Datos mapeados listos para el sheet
          sheetData: scrapedResult.sheetData,
          
          // Variantes TRILOGY
          trilogy: scrapedResult.trilogyVariants,
          
          // Metadata
          productUrl: scrapedResult.productUrl,
          metadata: scrapedResult.metadata,
          
          // Performance
          processingTime: Date.now() - startTime,
          cached: false
        };
      }
      
    } else if (dutyResult.duty === 'LD') {
      console.log('   🔧 Usando scraper FRAM (Light Duty)...');
      scrapedResult = await scrapeFRAMEnhanced(code);
      
      if (scrapedResult.success) {
        return {
          success: true,
          source: 'scraped_fram_enhanced',
          duty: dutyResult,
          
          // Datos mapeados listos para el sheet
          sheetData: scrapedResult.sheetData,
          
          // Variantes TRILOGY
          trilogy: scrapedResult.trilogyVariants,
          
          // Metadata
          productUrl: scrapedResult.productUrl,
          metadata: scrapedResult.metadata,
          
          // Performance
          processingTime: Date.now() - startTime,
          cached: false
        };
      }
      
    } else if (dutyResult.duty === 'MARINE') {
      console.log('   ⚓ DUTY: MARINE detectado');
      // TODO: Implementar scraper marino
      return {
        success: false,
        error: 'Marine scraper not yet implemented',
        duty: dutyResult,
        processingTime: Date.now() - startTime
      };
    }
    
    // === PASO 5: NO SE PUDO SCRAPEAR ===
    console.log('❌ No se pudo obtener datos del scraping');
    return {
      success: false,
      error: scrapedResult?.error || 'Scraping failed',
      duty: dutyResult,
      processingTime: Date.now() - startTime
    };
    
  } catch (error) {
    console.error('🔴 ERROR EN ORCHESTRATOR:', error.message);
    return {
      success: false,
      error: error.message,
      stack: error.stack,
      processingTime: Date.now() - startTime
    };
  }
}

/**
 * Procesa múltiples códigos en batch
 */
async function processMultipleFilters(codes, options = {}) {
  console.log(`\n🎯 ====== PROCESAMIENTO BATCH: ${codes.length} códigos ======`);
  
  const results = [];
  const startTime = Date.now();
  
  for (let i = 0; i < codes.length; i++) {
    const code = codes[i];
    console.log(`\n[${i + 1}/${codes.length}] Procesando: ${code}`);
    
    try {
      const result = await processFilterRequestEnhanced(code, options);
      results.push({
        code: code,
        ...result
      });
      
      // Delay entre requests para no saturar
      if (i < codes.length - 1) {
        await new Promise(resolve => setTimeout(resolve, options.delayMs || 2000));
      }
      
    } catch (error) {
      console.error(`   ❌ Error procesando ${code}:`, error.message);
      results.push({
        code: code,
        success: false,
        error: error.message
      });
    }
  }
  
  // === RESUMEN ===
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const cached = results.filter(r => r.cached).length;
  const scraped = results.filter(r => r.success && !r.cached).length;
  
  console.log(`\n✅ ====== BATCH COMPLETADO ======`);
  console.log(`   Total: ${results.length}`);
  console.log(`   Exitosos: ${successful}`);
  console.log(`   Fallidos: ${failed}`);
  console.log(`   Desde cache: ${cached}`);
  console.log(`   Scrapeados: ${scraped}`);
  console.log(`   Tiempo total: ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
  
  return {
    success: true,
    results: results,
    summary: {
      total: results.length,
      successful: successful,
      failed: failed,
      cached: cached,
      scraped: scraped,
      totalTime: Date.now() - startTime,
      averageTime: Math.round((Date.now() - startTime) / results.length)
    }
  };
}

module.exports = {
  processFilterRequestEnhanced,
  processMultipleFilters
};
