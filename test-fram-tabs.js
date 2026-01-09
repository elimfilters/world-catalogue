const puppeteer = require('puppeteer');

async function testFRAMTab() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('https://www.fram.com/fram-extra-guard-oil-filter-spin-on-ph3600', {
    waitUntil: 'networkidle2'
  });
  
  await page.waitForTimeout(3000);
  
  // Ver TODOS los tabs disponibles
  const tabs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[role="tab"]')).map(tab => ({
      text: tab.textContent.trim(),
      html: tab.outerHTML.substring(0, 100)
    }));
  });
  
  console.log('TABS ENCONTRADOS:');
  console.log(JSON.stringify(tabs, null, 2));
  
  console.log('\n🔍 Inspecciona manualmente el navegador');
  console.log('Cierra el navegador cuando termines');
}

testFRAMTab().catch(console.error);
