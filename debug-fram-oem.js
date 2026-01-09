const puppeteer = require('puppeteer');

async function debugFRAM() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('https://www.fram.com/fram-extra-guard-oil-filter-spin-on-ph3600', { 
    waitUntil: 'networkidle2' 
  });
  
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
    const competitorTab = tabs.find(tab => tab.textContent.includes('COMPETITOR'));
    if (competitorTab) competitorTab.click();
  });
  
  await page.waitForTimeout(3000);
  
  // Click en página 5 para ver Chrysler
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => {
      const nextButton = Array.from(document.querySelectorAll('button, a'))
        .find(el => el.textContent.includes('Next') || el.textContent.includes('>'));
      if (nextButton) nextButton.click();
    });
    await page.waitForTimeout(1500);
  }
  
  console.log('Navegador en página 5. Inspecciona la tabla con F12.');
  console.log('Busca las filas de Chrysler y Ford.');
  console.log('Copia el HTML de una fila OEM completa aquí.');
  console.log('\nCierra el navegador cuando termines.');
}

debugFRAM().catch(console.error);
