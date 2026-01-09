const { scrapeFRAMAllCodes } = require('./services/scrapers/fram.complete.scraper');

const testCodes = [
  { code: 'PH3600', type: 'Oil Filter' },      // ✅ Existe
  { code: 'CA10013', type: 'Air Filter' },     // ✅ Existe
  { code: 'CF10285', type: 'Cabin Air' },      // Código alternativo
  { code: 'G3', type: 'Fuel Filter' }          // Código alternativo
];

async function testAllTypes() {
  console.log('🧪 Probando FRAM con Puppeteer\n');
  
  for (const test of testCodes) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing: ${test.code} (${test.type})`);
    console.log('='.repeat(60));
    
    try {
      const result = await scrapeFRAMAllCodes(test.code);
      console.log(`✅ ${test.code}: SUCCESS`);
      console.log(`   - Specifications: ${Object.keys(result.specifications).length} items`);
      console.log(`   - OEM Codes: ${result.oemCodes.length}`);
      console.log(`   - Cross Refs: ${result.crossReferences.length}`);
      console.log(`   - Applications: ${result.applications.length}`);
      
      // Mostrar primeros 3 OEM codes si existen
      if (result.oemCodes.length > 0) {
        console.log(`   - First OEM: ${result.oemCodes.slice(0, 3).join(', ')}`);
      }
    } catch (error) {
      console.log(`❌ ${test.code}: FAILED - ${error.message}`);
    }
  }
  
  console.log('\n🏁 Test completado');
}

testAllTypes();
