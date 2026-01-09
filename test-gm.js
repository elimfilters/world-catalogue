const puppeteer = require('puppeteer');

async function testSpecificCode() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('https://www.fram.com/fram-extra-guard-oil-filter-spin-on-ph3600', { 
    waitUntil: 'networkidle2' 
  });
  
  // Click en COMPARISON
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
    const tab = tabs.find(t => t.textContent.includes('COMPETITOR'));
    if (tab) tab.click();
  });
  
  await page.waitForTimeout(3000);
  
  // Buscar "General Motors" en el input
  await page.type('input[placeholder*="Search"]', 'General Motors', { delay: 100 });
  await page.waitForTimeout(2000);
  
  // Extraer lo que aparece
  const result = await page.evaluate(() => {
    const rows = document.querySelectorAll('table tr');
    const found = [];
    rows.forEach(row => {
      const text = row.textContent;
      if (text.includes('General Motors') || text.includes('GM')) {
        found.push(text);
      }
    });
    return found;
  });
  
  console.log('Filas con General Motors:', result);
  console.log('\nNavegador abierto. Inspecciona.');
}

testSpecificCode().catch(console.error);
