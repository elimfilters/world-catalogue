const puppeteer = require('puppeteer');

async function diagnosticFRAM() {
  const browser = await puppeteer.launch({ headless: false }); // VISIBLE
  const page = await browser.newPage();
  
  await page.goto('https://www.fram.com/fram-extra-guard-oil-filter-spin-on-ph3600', { 
    waitUntil: 'networkidle2', 
    timeout: 30000 
  });
  
  console.log('Página cargada. Esperando 5 segundos...');
  await page.waitForTimeout(5000);
  
  // Buscar todos los elementos que contengan "comparison"
  const tabs = await page.evaluate(() => {
    const elements = [];
    document.querySelectorAll('*').forEach(el => {
      const text = el.textContent || '';
      const classes = el.className || '';
      const id = el.id || '';
      
      if (text.toLowerCase().includes('comparison') || 
          classes.toLowerCase().includes('comparison') ||
          id.toLowerCase().includes('comparison') ||
          text.toLowerCase().includes('cross reference')) {
        elements.push({
          tag: el.tagName,
          text: text.substring(0, 50),
          class: classes,
          id: id
        });
      }
    });
    return elements;
  });
  
  console.log('Elementos encontrados con "comparison":');
  console.log(JSON.stringify(tabs, null, 2));
  
  console.log('\nNavegador abierto. Ciérralo manualmente cuando termines de inspeccionar.');
  // NO cerrar el navegador para que puedas inspeccionar
}

diagnosticFRAM().catch(console.error);
