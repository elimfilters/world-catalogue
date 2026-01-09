const puppeteer = require('puppeteer');
const { classifyWithGroq } = require('../groq.classifier');

async function scrapeFRAMAllCodes(framCode) {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox']
  });
  
  const page = await browser.newPage();
  const url = 'https://www.fram.com/fram-extra-guard-oil-filter-spin-on-' + framCode.toLowerCase();
  
  console.log('[FRAM GROQ] Scraping:', framCode);
  
  await page.goto(url, { 
    waitUntil: 'networkidle2',
    timeout: 30000
  });
  
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
    const competitorTab = tabs.find(tab => 
      tab.textContent.includes('COMPETITOR') || 
      tab.textContent.includes('PART')
    );
    if (competitorTab) competitorTab.click();
  });
  
  await page.waitForTimeout(2000);
  
  // Limpiar filtros
  await page.evaluate(() => {
    const searchInputs = document.querySelectorAll('input[type="search"], input[placeholder*="Search"]');
    searchInputs.forEach(input => {
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });
  
  await page.waitForTimeout(2000);
  
  let allCodes = [];
  let currentPage = 1;
  let hasNextPage = true;
  const maxPages = 50;
  
  while (hasNextPage && currentPage <= maxPages) {
    console.log('[FRAM GROQ] PÃ¡gina ' + currentPage + '...');
    
    const pageCodes = await page.evaluate(() => {
      const result = [];
      const rows = document.querySelectorAll('table tbody tr, table tr');
      
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 2) {
          const brand = cells[0]?.textContent.trim();
          const code = cells[1]?.textContent.trim();
          
          if (brand && code && 
              code.length > 2 && 
              !brand.match(/^\d{4}$/) &&
              !brand.match(/^\d{2}-\d{2}$/) &&
              brand.toLowerCase() !== 'competitor name') {
            result.push({ brand, code });
          }
        }
      });
      
      return result;
    });
    
    allCodes = allCodes.concat(pageCodes);
    
    hasNextPage = await page.evaluate(() => {
      const nextButtons = Array.from(document.querySelectorAll('button, a'));
      const nextButton = nextButtons.find(el => {
        const text = el.textContent.trim();
        return (text.includes('Next') || text === '>') && !el.disabled;
      });
      
      if (nextButton) {
        nextButton.click();
        return true;
      }
      return false;
    });
    
        hasNextPage = await page.evaluate((currentPageNum) => {
      const nextButtons = Array.from(document.querySelectorAll('button, a'));
      const nextButton = nextButtons.find(el => {
        const text = el.textContent.trim();
        return (text.includes('Next') || text === '>' || text === '›') && !el.disabled && !el.classList.contains('disabled');
      });
      
      if (nextButton) {
        nextButton.click();
        return true;
      }
      return false;
    }, currentPage);
    
    if (hasNextPage) {
      await page.waitForTimeout(3000);
      
      // Verificar que realmente cambió de página
      const newPageCodes = await page.evaluate(() => {
        const rows = document.querySelectorAll('table tbody tr, table tr');
        return rows.length;
      });
      
      if (newPageCodes === 0) {
        console.log('[FRAM GROQ] No hay más resultados');
        break;
      }
      
      currentPage++;
    } else {
      break;
    }
  }
  
  await browser.close();
  
  console.log('[FRAM GROQ] Total cÃ³digos extraÃ­dos:', allCodes.length);
  console.log('[FRAM GROQ] Enviando a GROQ para clasificaciÃ³n...');
  
  const { oemCodes, aftermarketCodes, classification } = await classifyWithGroq(allCodes);
  
  console.log('[FRAM GROQ] OEM:', oemCodes.length);
  console.log('[FRAM GROQ] Aftermarket:', aftermarketCodes.length);
  
  return {
    success: true,
    totalCodes: allCodes.length,
    oemCodes,
    aftermarketCodes,
    allCodes,
    classification
  };
}

module.exports = { scrapeFRAMAllCodes };
