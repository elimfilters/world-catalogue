const puppeteer = require('puppeteer');
const { classifyManufacturerWithGroq } = require('../groq.classifier');

async function scrapeFRAMWithPuppeteer(framCode) {
  let browser;
  
  try {
    const filterType = framCode.toUpperCase().startsWith('CA') ? 'air-filter-rigid-panel' :
                       framCode.toUpperCase().startsWith('CF') ? 'cabin-air-filter' :
                       framCode.toUpperCase().startsWith('G') ? 'fuel-filter' : 'oil-filter-spin-on';
    
    const url = `https://www.fram.com/fram-extra-guard-${filterType}-${framCode.toLowerCase()}`;
    
    browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    // Click en tab que contiene "COMPETITOR"
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
      const tab = tabs.find(t => t.textContent.includes('COMPETITOR'));
      if (tab) tab.click();
    });
    
    await page.waitForTimeout(2000);
    
    const allCodes = [];
    let hasNext = true;
    let pageNum = 1;
    
    while (hasNext && pageNum <= 50) {
      const codes = await page.evaluate(() => {
        const result = [];
        document.querySelectorAll('table tr').forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 2) {
            const brand = cells[0]?.textContent.trim();
            const code = cells[1]?.textContent.trim();
            if (brand && code && /^[A-Z0-9-]+$/i.test(code)) {
              result.push({ brand, code });
            }
          }
        });
        return result;
      });
      
      allCodes.push(...codes);
      
      hasNext = await page.evaluate(() => {
        const next = Array.from(document.querySelectorAll('button, a'))
          .find(el => el.textContent.includes('Next') || el.textContent.includes('>'));
        if (next && !next.disabled) { next.click(); return true; }
        return false;
      });
      
      if (hasNext) await page.waitForTimeout(1500);
      pageNum++;
    }
    
    await browser.close();
    
    return {
      framCode,
      totalCodes: allCodes.length,
      totalPages: pageNum - 1,
      codes: allCodes
    };
    
  } catch (error) {
    if (browser) await browser.close();
    throw error;
  }
}

module.exports = { scrapeFRAMWithPuppeteer };
