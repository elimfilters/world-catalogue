const puppeteer = require('puppeteer');

/**
 * FRAM SCRAPER CON PUPPETEER - EXTRAE TAB COMPARISON
 * Separa OEM Codes y Cross Reference Codes
 */
async function scrapeFRAMWithComparison(framCode) {
  let browser;
  try {
    console.log('[FRAM PUPPETEER] Iniciando para:', framCode);
    
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    const url = `https://www.fram.com/fram-extra-guard-oil-filter-spin-on-${framCode.toLowerCase()}`;
    console.log('[FRAM PUPPETEER] URL:', url);
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Hacer clic en el tab COMPARISON
    console.log('[FRAM PUPPETEER] Buscando tab COMPARISON...');
    await page.waitForSelector('[data-tab="comparison"], .tab-comparison, button:has-text("Comparison")', { timeout: 10000 });
    await page.click('[data-tab="comparison"], .tab-comparison, button:has-text("Comparison")');
    await page.waitForTimeout(2000);
    
    // Extraer OEM Codes y Aftermarket Codes
    const comparisonData = await page.evaluate(() => {
      const oemCodes = [];
      const aftermarketCodes = [];
      
      // Buscar tabla de OEM
      document.querySelectorAll('table tr, .oem-codes tr, [class*="oem"] tr').forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 2) {
          const brand = cells[0]?.textContent.trim();
          const code = cells[1]?.textContent.trim();
          if (brand && code && code.length > 2) {
            oemCodes.push(`|${code}`);
          }
        }
      });
      
      // Buscar tabla de Aftermarket
      document.querySelectorAll('.aftermarket tr, [class*="cross"] tr').forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 2) {
          const brand = cells[0]?.textContent.trim();
          const code = cells[1]?.textContent.trim();
          if (brand && code && code.length > 2) {
            aftermarketCodes.push(`|${code}`);
          }
        }
      });
      
      return { oemCodes, aftermarketCodes };
    });
    
    console.log('[FRAM PUPPETEER] ✅ OEM Codes:', comparisonData.oemCodes.length);
    console.log('[FRAM PUPPETEER] ✅ Aftermarket Codes:', comparisonData.aftermarketCodes.length);
    
    await browser.close();
    
    return {
      success: true,
      oemCodes: comparisonData.oemCodes,
      aftermarketCodes: comparisonData.aftermarketCodes
    };
    
  } catch (error) {
    console.error('[FRAM PUPPETEER] ❌ Error:', error.message);
    if (browser) await browser.close();
    throw error;
  }
}

module.exports = { scrapeFRAMWithComparison };
