const puppeteer = require('puppeteer');

async function debugCA10013() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('🔍 Intentando abrir CA10013...\n');
  
  // Probar URL de Air Filter
  const response = await page.goto('https://www.fram.com/fram-extra-guard-air-filter-rigid-panel-ca10013', {
    waitUntil: 'networkidle2',
    timeout: 30000
  }).catch(err => {
    console.log('❌ Error navegando:', err.message);
    return null;
  });
  
  if (!response) {
    console.log('❌ No se pudo cargar la página');
    await browser.close();
    return;
  }
  
  console.log('Status:', response.status());
  
  if (response.status() === 404) {
    console.log('❌ 404 - CA10013 NO EXISTE en FRAM');
    await browser.close();
    return;
  }
  
  await page.waitForTimeout(3000);
  
  const pageTitle = await page.title();
  console.log('✅ Título:', pageTitle);
  
  const tabs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[role="tab"]')).map(tab => tab.textContent.trim());
  });
  
  console.log('✅ Tabs encontrados:', tabs);
  
  // Buscar tab COMPETITOR
  const hasCompetitor = tabs.some(t => t.includes('COMPETITOR'));
  console.log(hasCompetitor ? '✅ Tab COMPETITOR encontrado' : '❌ Tab COMPETITOR NO encontrado');
  
  console.log('\n🔍 Navegador abierto - verifica manualmente');
}

debugCA10013().catch(console.error);
