const puppeteer = require('puppeteer');

async function investigateDonaldson() {
  const browser = await puppeteer.launch({ headless: false, slowMo: 100 });
  const page = await browser.newPage();
  
  console.log('🔍 Investigando sitio Donaldson...\n');
  
  const testCode = 'P550400'; // Oil filter muy común en Heavy Duty
  
  const urls = [
    'https://www.donaldson.com/en-us/engine/products/p550400',
    'https://shop.donaldson.com/products/p550400',
    'https://www.donaldson.com/content/donaldson/en-us/engine/filters/p550400.html'
  ];
  
  for (const url of urls) {
    console.log(`Probando: ${url}`);
    
    const response = await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 15000
    }).catch(() => null);
    
    if (response && response.status() === 200) {
      const title = await page.title();
      console.log(`\n✅ ENCONTRADO!`);
      console.log(`   URL: ${url}`);
      console.log(`   Título: ${title}`);
      
      await page.waitForTimeout(3000);
      
      // Buscar tabs o secciones
      const structure = await page.evaluate(() => {
        return {
          tabs: Array.from(document.querySelectorAll('[role="tab"]')).map(t => t.textContent.trim()),
          headers: Array.from(document.querySelectorAll('h1, h2, h3')).slice(0, 10).map(h => h.textContent.trim())
        };
      });
      
      console.log('\n📊 Estructura encontrada:');
      console.log('Tabs:', structure.tabs);
      console.log('Headers:', structure.headers);
      
      console.log('\n🔍 Navegador abierto - inspecciona manualmente');
      return;
    } else {
      console.log(`   ❌ ${response ? response.status() : 'Error'}`);
    }
  }
  
  console.log('\n❌ Ninguna URL funcionó');
  await browser.close();
}

investigateDonaldson().catch(console.error);
