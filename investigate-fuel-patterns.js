const puppeteer = require('puppeteer');

async function investigateFuelPatterns() {
  const browser = await puppeteer.launch({ 
    headless: false,
    slowMo: 100 
  });
  const page = await browser.newPage();
  
  const fuelCodes = ['G3', 'G3614', 'G7', 'PS7317'];
  const patterns = [
    'fuel-filter-in-line',
    'fuel-filter',
    'fuel-water-separator',
    'diesel-fuel-filter'
  ];
  
  const results = {};
  
  for (const code of fuelCodes) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🔍 Probando ${code}...`);
    console.log('='.repeat(50));
    
    // Probar SIN línea de producto
    for (const pattern of patterns) {
      const url = `https://www.fram.com/fram-${pattern}-${code.toLowerCase()}`;
      console.log(`  Probando: ${url.substring(20)}...`);
      
      try {
        const response = await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 10000
        });
        
        const status = response.status();
        console.log(`    Status: ${status}`);
        
        if (status === 200) {
          const title = await page.title();
          console.log(`    ✅ ENCONTRADO! Título: ${title.substring(0, 50)}`);
          results[code] = { pattern, url, hasProductLine: false };
          break;
        }
      } catch (e) {
        console.log(`    ❌ Error o 404`);
      }
      
      await page.waitForTimeout(500);
    }
    
    if (!results[code]) {
      console.log(`  ❌ ${code}: No encontrado en ningún patrón`);
    }
    
    await page.waitForTimeout(1000);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESUMEN FINAL:');
  console.log('='.repeat(50));
  console.log(JSON.stringify(results, null, 2));
  
  const patternsFound = Object.values(results).map(r => r.pattern);
  const uniquePatterns = [...new Set(patternsFound)];
  
  console.log('\n✅ Patrones únicos encontrados:');
  uniquePatterns.forEach(p => console.log('  -', p));
  
  console.log('\n🔍 Navegador abierto - inspecciona manualmente');
}

investigateFuelPatterns().catch(console.error);
