const puppeteer = require('puppeteer');

async function debugCA10013Detailed() {
  const browser = await puppeteer.launch({ headless: false }); // VISIBLE
  const page = await browser.newPage();
  
  await page.goto('https://www.fram.com/fram-extra-guard-air-filter-rigid-panel-ca10013', {
    waitUntil: 'networkidle2'
  });
  
  await page.waitForTimeout(3000);
  
  console.log('🔍 Buscando tabs...');
  
  // Ver TODOS los tabs
  const allTabs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[role="tab"], .tab, [data-tab], button, a')).map(el => ({
      tag: el.tagName,
      text: el.textContent.trim().substring(0, 50),
      role: el.getAttribute('role'),
      dataTab: el.getAttribute('data-tab'),
      classes: el.className
    }));
  });
  
  console.log('Tabs encontrados:', JSON.stringify(allTabs.filter(t => 
    t.text.includes('COMPARISON') || 
    t.text.includes('COMPETITOR') ||
    t.text.includes('APPLICATION')
  ), null, 2));
  
  // Intentar hacer click en COMPARISON
  console.log('\n🖱️ Intentando click en tab COMPARISON...');
  
  const clicked = await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('*'));
    const compTab = tabs.find(t => t.textContent.includes('COMPARISON'));
    
    if (compTab) {
      console.log('Tab encontrado:', compTab.textContent);
      compTab.click();
      return true;
    }
    return false;
  });
  
  console.log(clicked ? '✅ Click exitoso' : '❌ No se encontró el tab');
  
  await page.waitForTimeout(2000);
  
  // Ver tabla
  const tableData = await page.evaluate(() => {
    const rows = [];
    document.querySelectorAll('table tr').forEach(row => {
      const cells = Array.from(row.querySelectorAll('td')).map(c => c.textContent.trim());
      if (cells.length > 0) rows.push(cells);
    });
    return rows;
  });
  
  console.log('\n📊 Primeras 10 filas de tabla:');
  console.log(tableData.slice(0, 10));
  
  console.log('\n🔍 Navegador abierto - inspecciona manualmente');
}

debugCA10013Detailed().catch(console.error);
