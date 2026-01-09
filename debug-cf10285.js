const puppeteer = require('puppeteer');

async function debugCF10285() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  const url = 'https://www.fram.com/fram-extra-guard-cabin-air-filter-cf10285';
  console.log('URL:', url);
  
  const response = await page.goto(url, {
    waitUntil: 'networkidle2',
    timeout: 30000
  }).catch(err => null);
  
  if (!response || response.status() !== 200) {
    console.log('❌ Código no existe o 404');
    await browser.close();
    return;
  }
  
  console.log('✅ Status:', response.status());
  
  await page.waitForTimeout(3000);
  
  const tabs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[role="tab"]')).map(t => t.textContent.trim());
  });
  
  console.log('Tabs:', tabs);
  
  const hasComparison = tabs.some(t => t.includes('COMPARISON') || t.includes('COMPETITOR'));
  console.log(hasComparison ? '✅ Tiene COMPARISON' : '❌ Sin COMPARISON');
  
  console.log('\n🔍 Navegador abierto - inspecciona manualmente');
}

debugCF10285().catch(console.error);
