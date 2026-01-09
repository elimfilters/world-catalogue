const puppeteer = require('puppeteer');
const groqClassifier = require('../groq.classifier');
const classifyManufacturerWithGroq = groqClassifier.classifyManufacturerWithGroq || groqClassifier;

async function scrapeFRAMUniversal(framCode) {
  let browser;
  
  try {
    console.log(`[FRAM UNIVERSAL] Scraping: ${framCode}`);
    
    // Detectar tipo de filtro
    const filterType = framCode.toUpperCase().startsWith('CA') ? 'air-filter-rigid-panel' :
                       framCode.toUpperCase().startsWith('CF') ? 'cabin-air-filter' :
                       framCode.toUpperCase().startsWith('G') ? 'fuel-filter' : 'oil-filter-spin-on';
    
    const url = `https://www.fram.com/fram-extra-guard-${filterType}-${framCode.toLowerCase()}`;
    
    browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    // Intentar hacer clic en tab COMPARISON si existe
    const tabClicked = await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('*'));
      const compTab = tabs.find(t => 
        t.textContent && (t.textContent.includes('COMPARISON') || t.textContent.includes('COMPETITOR'))
      );
      
      if (compTab) {
        compTab.click();
        return true;
      }
      return false;
    });
    
    if (tabClicked) {
      console.log('[FRAM UNIVERSAL] ✅ Tab clickeado, esperando...');
      await page.waitForTimeout(2000);
    } else {
      console.log('[FRAM UNIVERSAL] ℹ️ Sin tab, extrayendo datos directamente...');
    }
    
    // Extraer todos los códigos con paginación
    const allCodes = [];
    let pageNum = 1;
    let hasNext = true;
    
    while (hasNext && pageNum <= 50) {
      console.log(`[FRAM UNIVERSAL] Página ${pageNum}...`);
      
      const codes = await page.evaluate(() => {
        const result = [];
        
        document.querySelectorAll('table tr').forEach(row => {
          const cells = row.querySelectorAll('td');
          
          // Cross-references: 2 columnas (Brand | Code)
          if (cells.length === 2) {
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
      
      // Buscar botón Next
      hasNext = await page.evaluate(() => {
        const next = Array.from(document.querySelectorAll('button, a'))
          .find(el => el.textContent.includes('Next') || el.textContent.includes('>'));
        
        if (next && !next.disabled) {
          next.click();
          return true;
        }
        return false;
      });
      
      if (hasNext) await page.waitForTimeout(1500);
      pageNum++;
    }
    
    console.log(`[FRAM UNIVERSAL] Total códigos extraídos: ${allCodes.length}`);
    
    // Clasificar con GROQ
    console.log('[FRAM UNIVERSAL] Clasificando con GROQ...');
    
    const classified = await Promise.all(
      allCodes.map(async item => {
        const manufacturer = await classifyManufacturerWithGroq(item.code);
        return {
          brand: item.brand,
          code: item.code,
          manufacturer,
          classifiedBy: 'GROQ'
        };
      })
    );
    
    // Separar OEM vs Aftermarket
    const oemBrands = ['CHRYSLER', 'FORD', 'GM', 'GENERAL MOTORS', 'MAZDA', 'VOLKSWAGEN', 
                       'VW', 'TOYOTA', 'HONDA', 'NISSAN', 'BMW', 'MERCEDES', 'ACURA'];
    
    const oemCodes = classified.filter(c => 
      oemBrands.some(oem => c.brand.toUpperCase().includes(oem))
    );
    
    const aftermarketCodes = classified.filter(c => 
      !oemBrands.some(oem => c.brand.toUpperCase().includes(oem))
    );
    
    await browser.close();
    
    console.log(`[FRAM UNIVERSAL] OEM: ${oemCodes.length}`);
    console.log(`[FRAM UNIVERSAL] Aftermarket: ${aftermarketCodes.length}`);
    
    return {
      success: true,
      framCode,
      filterType,
      totalCodes: allCodes.length,
      totalPages: pageNum - 1,
      oemCodes: oemCodes.map(c => `${c.brand}|${c.code}`),
      aftermarketCodes: aftermarketCodes.map(c => `${c.brand}|${c.code}`)
    };
    
  } catch (error) {
    if (browser) await browser.close();
    throw error;
  }
}

module.exports = { scrapeFRAMAllCodes: scrapeFRAMUniversal };

