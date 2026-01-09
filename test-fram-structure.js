const puppeteer = require('puppeteer');

async function captureFRAMStructure() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('https://www.fram.com/fram-extra-guard-oil-filter-spin-on-ph3600', { 
    waitUntil: 'networkidle2' 
  });
  
  // Obtener todos los tabs/botones/links visibles
  const structure = await page.evaluate(() => {
    const result = {
      tabs: [],
      buttons: [],
      links: []
    };
    
    // Buscar tabs
    document.querySelectorAll('[role="tab"], .tab, [class*="tab"]').forEach(el => {
      result.tabs.push(el.textContent.trim().substring(0, 50));
    });
    
    // Buscar botones
    document.querySelectorAll('button').forEach(el => {
      result.buttons.push(el.textContent.trim().substring(0, 50));
    });
    
    // Buscar links importantes
    document.querySelectorAll('a[href*="cross"], a[href*="comparison"], a[href*="reference"]').forEach(el => {
      result.links.push({ text: el.textContent.trim(), href: el.href });
    });
    
    return result;
  });
  
  console.log(JSON.stringify(structure, null, 2));
  
  await browser.close();
}

captureFRAMStructure().catch(console.error);
