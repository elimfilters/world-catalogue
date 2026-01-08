// routes/scraperRoutes.js - WITH BATCH ENDPOINT v2.1.0

const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer-core');

// ==========================================
// ENDPOINT INDIVIDUAL: /api/scraper/donaldson/:sku
// ==========================================
router.get('/donaldson/:sku', async (req, res) => {
  const browserlessToken = process.env.BROWSERLESS_TOKEN;
  const { sku } = req.params;

  if (!browserlessToken) {
    return res.status(500).json({ success: false, error: 'BROWSERLESS_TOKEN no configurado' });
  }

  let browser;
  try {
    console.log(`[SEARCH] SKU: ${sku}`);

    browser = await puppeteer.connect({
      browserWSEndpoint: `wss://production-sfo.browserless.io?token=${browserlessToken}&blockAds=true&stealth=true`
    });

    const result = await scrapeDonaldsonProduct(browser, sku);
    res.json(result);

  } catch (error) {
    console.error('[ERROR]', error.message);
    res.status(500).json({ success: false, error: error.message, skuBuscado: sku });
  } finally {
    if (browser) await browser.close();
  }
});

// ==========================================
// ENDPOINT BATCH: /api/scraper/donaldson/batch
// Acepta: { "codes": ["1R1808", "P554005", "DBL7405"] }
// ==========================================
router.post('/donaldson/batch', async (req, res) => {
  const browserlessToken = process.env.BROWSERLESS_TOKEN;
  const { codes } = req.body;

  if (!browserlessToken) {
    return res.status(500).json({ success: false, error: 'BROWSERLESS_TOKEN no configurado' });
  }

  if (!codes || !Array.isArray(codes) || codes.length === 0) {
    return res.status(400).json({ 
      success: false, 
      error: 'Se requiere un array de códigos en el body: { "codes": ["1R1808", "P554005"] }' 
    });
  }

  if (codes.length > 10) {
    return res.status(400).json({ 
      success: false, 
      error: 'Máximo 10 códigos por batch' 
    });
  }

  let browser;
  try {
    console.log(`[BATCH] Procesando ${codes.length} códigos...`);

    browser = await puppeteer.connect({
      browserWSEndpoint: `wss://production-sfo.browserless.io?token=${browserlessToken}&blockAds=true&stealth=true`
    });

    const results = [];
    
    for (const code of codes) {
      try {
        console.log(`[BATCH] Buscando: ${code}`);
        const result = await scrapeDonaldsonProduct(browser, code);
        results.push(result);
      } catch (error) {
        console.error(`[BATCH] Error en ${code}:`, error.message);
        results.push({
          success: false,
          error: error.message,
          skuBuscado: code
        });
      }
    }

    console.log(`[BATCH] Completado: ${results.filter(r => r.success).length}/${codes.length} exitosos`);

    res.json({
      success: true,
      totalRequested: codes.length,
      totalSuccess: results.filter(r => r.success).length,
      totalFailed: results.filter(r => !r.success).length,
      results: results
    });

  } catch (error) {
    console.error('[BATCH ERROR]', error.message);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (browser) await browser.close();
  }
});

// ==========================================
// FUNCIÓN COMPARTIDA: Scrapear un producto
// ==========================================
async function scrapeDonaldsonProduct(browser, sku) {
  const page = await browser.newPage();
  
  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    const searchUrl = `https://shop.donaldson.com/store/en-us/search?Ntt=${sku}*&Ntk=All&originalSearchTerm=${sku}*`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForSelector('a[href*="/product/"], .no-results', { timeout: 10000 });

    const searchResult = await page.evaluate(() => {
      const link = document.querySelector('a[href*="/product/"]');
      if (!link) return { found: false };
      const match = link.href.match(/\/product\/([A-Z0-9-]+)\//);
      return { found: !!match, donaldsonCode: match ? match[1] : '', productUrl: link.href };
    });

    if (!searchResult.found) {
      return { success: false, error: 'Producto no encontrado', skuBuscado: sku };
    }

    await page.goto(searchResult.productUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 2000));
    
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(r => setTimeout(r, 2000));

    // Expandir cross-refs
    await page.evaluate(() => {
      const btn = document.querySelector('#showAllCrossReferenceListButton');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 3000));
    
    const productData = await page.evaluate(() => {
      const data = {
        donaldsonCode: '',
        description: '',
        specifications: {},
        crossReferences: [],
        equipmentApplications: []
      };

      const codeEl = document.querySelector('#productPageProductNumber');
      if (codeEl) data.donaldsonCode = codeEl.textContent.trim();

      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        const content = metaDesc.getAttribute('content');
        const match = content.match(/((?:LUBE|AIR|FUEL|HYDRAULIC|CABIN)\s+FILTER[^-,]*)/i);
        if (match) data.description = match[1].trim();
      }

      // Specs
      const text = document.body.innerText;
      const specs = {};
      ['Thread Size', 'Outer Diameter', 'Height', 'Micron Rating'].forEach(key => {
        const m = text.match(new RegExp(key + '[:\\s]+([^\\n]+)', 'i'));
        if (m) specs[key] = m[1].trim();
      });
      data.specifications = specs;

      // Cross-refs
      const table = document.querySelector('.applicationPartTablePDP');
      if (table) {
        table.querySelectorAll('tbody tr').forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 2) {
            const mfg = cells[0].textContent.trim();
            const part = cells[1].textContent.trim();
            if (mfg && part && mfg !== 'Manufacturer Name') {
              data.crossReferences.push({
                manufacturer: mfg,
                partNumber: part,
                notes: cells[2] ? cells[2].textContent.trim() : ''
              });
            }
          }
        });
      }

      // Equipment
      document.querySelectorAll('table').forEach(t => {
        const h = t.querySelector('thead tr, tr:first-child');
        if (h && h.textContent.toLowerCase().includes('equipment')) {
          t.querySelectorAll('tbody tr, tr').forEach((r, i) => {
            if (i === 0) return;
            const cells = r.querySelectorAll('td');
            if (cells.length >= 3) {
              const eq = cells[0].textContent.trim();
              if (eq && eq !== 'Equipment') {
                data.equipmentApplications.push({
                  equipment: eq,
                  year: cells[1] ? cells[1].textContent.trim() : '',
                  type: cells[2] ? cells[2].textContent.trim() : '',
                  engine: cells[3] ? cells[3].textContent.trim() : ''
                });
              }
            }
          });
        }
      });

      return data;
    });

    const filterType = (d => {
      if (d.includes('lube') || d.includes('oil')) return 'Lube';
      if (d.includes('air')) return 'Air';
      if (d.includes('fuel')) return 'Fuel';
      if (d.includes('hydraulic')) return 'Hydraulic';
      if (d.includes('cabin')) return 'Cabin';
      return 'Unknown';
    })(productData.description.toLowerCase());

    await page.close();

    return {
      success: true,
      data: {
        skuBuscado: sku,
        donaldsonCode: searchResult.donaldsonCode,
        isOEMSearch: sku.toUpperCase() !== searchResult.donaldsonCode.toUpperCase(),
        description: productData.description,
        filterType,
        isKit: productData.description.toLowerCase().includes('kit'),
        specifications: productData.specifications,
        crossReferences: productData.crossReferences,
        equipmentApplications: productData.equipmentApplications,
        urlFinal: searchResult.productUrl,
        timestamp: new Date().toISOString(),
        version: "BATCH_v2.1.0"
      }
    };

  } catch (error) {
    await page.close();
    throw error;
  }
}

module.exports = router;router.post("/donaldson/batch", async (req, res) => {
  try {
    const { codes } = req.body || {};
    if (!Array.isArray(codes) || codes.length === 0) {
      return res.status(400).json({ success: false, error: "codes array required" });
    }

    const results = [];
    let totalSuccess = 0;
    let totalFailed = 0;

    for (const code of codes.slice(0, 10)) {
      try {
        const data = await scrapeDonaldson(code);
        results.push({ code, success: true, data });
        totalSuccess++;
      } catch (err) {
        results.push({ code, success: false, error: err.message });
        totalFailed++;
      }
    }

    res.json({
      success: true,
      totalRequested: codes.length,
      totalSuccess,
      totalFailed,
      results
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});
