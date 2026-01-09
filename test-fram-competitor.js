const puppeteer = require('puppeteer');

async function extractCompetitorCodes() {
  const browser = await puppeteer.launch({ headless: false }); // VISIBLE para ver
  const page = await browser.newPage();
  
  await page.goto('https://www.fram.com/fram-extra-guard-oil-filter-spin-on-ph3600', { 
    waitUntil: 'networkidle2' 
  });
  
  console.log('Buscando tab COMPETITOR...');
  
  // Hacer clic en el tab de competidores
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
    const competitorTab = tabs.find(tab => 
      tab.textContent.includes('COMPETITOR') || 
      tab.textContent.includes('PART')
    );
    if (competitorTab) competitorTab.click();
  });
  
  await page.waitForTimeout(3000);
  
  console.log('Extrayendo códigos...');
  
  const codes = await page.evaluate(() => {
    const result = [];
    const rows = document.querySelectorAll('table tr, [class*="competitor"] tr');
    
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 2) {
        const brand = cells[0]?.textContent.trim();
        const code = cells[1]?.textContent.trim();
        if (brand && code && code.length > 2) {
          result.push({ brand, code });
        }
      }
    });
    
    return result;
  });
  
  console.log('Total códigos extraídos:', codes.length);
  console.log('Primeros 20:');
  codes.slice(0, 20).forEach(c => console.log(` - ${c.brand}: ${c.code}`));
  
  console.log('\nNavegador abierto. Verifica que el tab COMPETITOR esté seleccionado.');
  console.log('Cierra el navegador cuando termines de inspeccionar.');
}

extractCompetitorCodes().catch(console.error);

