const puppeteer = require('puppeteer');
const { classifyWithGroq } = require('../groq.classifier');

async function scrapeFRAMAllCodes(framCode) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  
  // Detectar tipo de filtro
  const codeUpper = framCode.toUpperCase();
  let filterType = 'oil-filter-spin-on';
  
  if (codeUpper.startsWith('CA')) {
    filterType = 'air-filter-rigid-panel';
  } else if (codeUpper.startsWith('CF')) {
    filterType = 'cabin-air-filter';
  } else if (codeUpper.startsWith('G') || codeUpper.startsWith('PS')) {
    filterType = 'fuel-filter-in-line';
  }
  
  // Probar primero SIN línea de producto, luego CON línea
  const productLines = ['', 'extra-guard', 'fresh-breeze', 'ultra-synthetic', 'tough-guard'];
  let url = null;
  let response = null;
  
  console.log('[FRAM GROQ] Scraping:', framCode);
  
  for (const line of productLines) {
    let testUrl;
    
    if (line === '') {
      // Sin línea de producto
      testUrl = `https://www.fram.com/fram-${filterType}-${framCode.toLowerCase()}`;
    } else {
      // Con línea de producto
      testUrl = `https://www.fram.com/fram-${line}-${filterType}-${framCode.toLowerCase()}`;
    }
    
    console.log('[FRAM GROQ] Probando:', testUrl.substring(20, 70) + '...');
    
    response = await page.goto(testUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    }).catch(() => null);
    
    if (response && response.status() === 200) {
      url = testUrl;
      const foundIn = line || 'sin línea de producto';
      console.log('[FRAM GROQ] ✅ Encontrado en:', foundIn);
      break;
    }
  }
  
  if (!response || response.status() !== 200) {
    await browser.close();
    throw new Error(`Código ${framCode} no encontrado en ninguna línea de producto`);
  }

  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
    const comparisonTab = tabs.find(tab =>
      tab.textContent.includes('COMPARISON') ||
      tab.textContent.includes('COMPETITOR') ||
      tab.textContent.includes('PART')
    );
    if (comparisonTab) comparisonTab.click();
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
    console.log('[FRAM GROQ] Página ' + currentPage + '...');

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
              brand.toLowerCase() !== 'comparison name') {
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
        return (text.includes('Next') || text === '>' || text === '›') && !el.disabled && !el.classList.contains('disabled');
      });

      if (nextButton) {
        nextButton.click();
        return true;
      }
      return false;
    });

    if (hasNextPage) {
      await page.waitForTimeout(3000);

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

  console.log('[FRAM GROQ] Total códigos extraídos:', allCodes.length);
  console.log('[FRAM GROQ] Enviando a GROQ para clasificación...');

  const { oemCodes, aftermarketCodes, classification } = await classifyWithGroq(allCodes);

  console.log('[FRAM GROQ] OEM:', oemCodes.length);
  console.log('[FRAM GROQ] Aftermarket:', aftermarketCodes.length);

  return {
    success: true,
    framCode,
    filterType,
    productLine: url,
    totalCodes: allCodes.length,
    oemCodes,
    aftermarketCodes,
    allCodes,
    classification
  };
}

module.exports = { scrapeFRAMAllCodes };



