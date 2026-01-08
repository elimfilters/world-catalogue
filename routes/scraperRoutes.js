// routes/scraperRoutes.js - IMPROVED: Better "Show All" handling

const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer-core');

router.get('/donaldson/:sku', async (req, res) => {
  const browserlessToken = process.env.BROWSERLESS_TOKEN;
  const { sku } = req.params;

  if (!browserlessToken) {
    return res.status(500).json({
      success: false,
      error: 'BROWSERLESS_TOKEN no configurado'
    });
  }

  let browser;
  try {
    console.log(`[SEARCH] Iniciando busqueda para SKU: ${sku}`);

    browser = await puppeteer.connect({
      browserWSEndpoint: `wss://production-sfo.browserless.io?token=${browserlessToken}&blockAds=true&stealth=true`
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    // PASO 1: Buscar
    console.log('[SEARCH] Buscando en Donaldson...');
    const searchUrl = `https://shop.donaldson.com/store/en-us/search?Ntt=${sku}*&Ntk=All&originalSearchTerm=${sku}*`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForSelector('a[href*="/product/"], .no-results', { timeout: 10000 });

    // PASO 2: Obtener URL del producto
    const searchResult = await page.evaluate(() => {
      const productLink = document.querySelector('a[href*="/product/"]');
      if (!productLink) return { found: false };
      
      const href = productLink.href;
      const codeMatch = href.match(/\/product\/([A-Z0-9-]+)\//);
      
      return {
        found: !!codeMatch,
        donaldsonCode: codeMatch ? codeMatch[1] : '',
        productUrl: href
      };
    });

    if (!searchResult.found) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado',
        skuBuscado: sku
      });
    }

    console.log(`[SUCCESS] Codigo encontrado: ${searchResult.donaldsonCode}`);

    // PASO 3: Navegar al producto
    await page.goto(searchResult.productUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Esperar contenido inicial
    await new Promise(r => setTimeout(r, 3000));
    
    // Scroll completo para cargar todo
    console.log('[SCROLL] Haciendo scroll para cargar contenido...');
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await new Promise(r => setTimeout(r, 2000));
    
    // Scroll de vuelta arriba
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(r => setTimeout(r, 1000));

    // PASO 4: Expandir cross-references - MEJORADO
    console.log('[CROSSREF] Buscando boton "Show All"...');
    
    // Contar filas actuales
    const initialCount = await page.evaluate(() => {
      const table = document.querySelector('.applicationPartTablePDP');
      if (!table) return 0;
      return table.querySelectorAll('tbody tr').length;
    });
    console.log(`[CROSSREF] Filas iniciales: ${initialCount}`);

    // Intentar hacer clic en el botón con múltiples selectores
    const buttonClicked = await page.evaluate(() => {
      // Intentar varios selectores
      const selectors = [
        '#showAllCrossReferenceListButton',
        'button[id*="showAll"]',
        'button[id*="ShowAll"]',
        'button:contains("Show All")',
        'button:contains("Afficher plus")',
        '.showMoreLess button:first-child'
      ];
      
      for (const selector of selectors) {
        try {
          let button;
          if (selector.includes(':contains')) {
            // Buscar por texto
            const buttons = Array.from(document.querySelectorAll('button'));
            button = buttons.find(b => 
              b.textContent.includes('Show All') || 
              b.textContent.includes('Afficher plus') ||
              b.textContent.includes('Show More')
            );
          } else {
            button = document.querySelector(selector);
          }
          
          if (button && button.offsetParent !== null) {
            // El botón existe y es visible
            button.scrollIntoView({ behavior: 'smooth', block: 'center' });
            button.click();
            return true;
          }
        } catch (e) {
          continue;
        }
      }
      return false;
    });

    if (buttonClicked) {
      console.log('[CROSSREF] Boton clickeado, esperando carga...');
      await new Promise(r => setTimeout(r, 4000));
      
      // Verificar si aumentaron las filas
      const finalCount = await page.evaluate(() => {
        const table = document.querySelector('.applicationPartTablePDP');
        if (!table) return 0;
        return table.querySelectorAll('tbody tr').length;
      });
      console.log(`[CROSSREF] Filas finales: ${finalCount}`);
      
      if (finalCount > initialCount) {
        console.log(`[CROSSREF] ✓ Tabla expandida (+${finalCount - initialCount} filas)`);
      } else {
        console.log('[CROSSREF] ⚠ No se detectó expansión de la tabla');
      }
    } else {
      console.log('[CROSSREF] No se encontró botón "Show All"');
    }

    // PASO 5: Extraer información
    console.log('[EXTRACT] Extrayendo información completa...');
    
    const productData = await page.evaluate(() => {
      const data = {
        donaldsonCode: '',
        description: '',
        specifications: {},
        crossReferences: [],
        equipmentApplications: [],
        isKit: false
      };

      // Codigo
      const codeEl = document.querySelector('#productPageProductNumber');
      if (codeEl) {
        data.donaldsonCode = codeEl.textContent.trim().replace(/\s+/g, ' ');
      }

      // Descripcion
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        const content = metaDesc.getAttribute('content');
        const filterMatch = content.match(/(FILTE?R?[^.]+)/i);
        if (filterMatch) {
          data.description = filterMatch[1].trim().replace(/\s+/g, ' ');
        }
      }

      // Especificaciones
      const allText = document.body.innerText;
      const specs = {};
      const patterns = {
        'Thread Size': /Thread Size[:\s]+([^\n]+)/i,
        'Outer Diameter': /Outer Diameter[:\s]+([^\n]+)/i,
        'Inner Diameter': /Inner Diameter[:\s]+([^\n]+)/i,
        'Height': /(?:Height|Length)[:\s]+([^\n]+)/i,
        'Gasket OD': /Gasket OD[:\s]+([^\n]+)/i,
        'Gasket ID': /Gasket ID[:\s]+([^\n]+)/i,
        'Media Type': /Media Type[:\s]+([^\n]+)/i,
        'Type': /Type[:\s]+([^\n]+)/i,
        'Efficiency': /Efficiency[^:]*:[:\s]+([^\n]+)/i,
        'Flow Rate': /Flow Rate[:\s]+([^\n]+)/i
      };

      for (const [key, pattern] of Object.entries(patterns)) {
        const match = allText.match(pattern);
        if (match && match[1]) {
          specs[key] = match[1].trim();
        }
      }
      data.specifications = specs;

      // Cross-references - TODAS las filas
      const crossRefTable = document.querySelector('.applicationPartTablePDP');
      if (crossRefTable) {
        const rows = crossRefTable.querySelectorAll('tbody tr');
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 2) {
            const manufacturer = cells[0].textContent.trim();
            const partNumber = cells[1].textContent.trim();
            const notes = cells[2] ? cells[2].textContent.trim() : '';
            
            if (manufacturer && 
                partNumber && 
                manufacturer !== 'Nom du fabricant' &&
                manufacturer !== 'Manufacturer Name' &&
                manufacturer !== 'Manufacturer' &&
                !manufacturer.includes('Loading') &&
                partNumber.length > 0) {
              data.crossReferences.push({
                manufacturer,
                partNumber,
                notes
              });
            }
          }
        });
      }

      // Equipment Applications
      const allTables = document.querySelectorAll('table');
      allTables.forEach(table => {
        const headerRow = table.querySelector('thead tr, tr:first-child');
        if (!headerRow) return;
        
        const headerText = headerRow.textContent.toLowerCase();
        if (headerText.includes('equipment') || headerText.includes('application')) {
          const rows = table.querySelectorAll('tbody tr, tr');
          rows.forEach((row, idx) => {
            if (idx === 0) return; // Skip header
            
            const cells = row.querySelectorAll('td');
            if (cells.length >= 3) {
              const equipment = cells[0].textContent.trim();
              const year = cells[1] ? cells[1].textContent.trim() : '';
              const type = cells[2] ? cells[2].textContent.trim() : '';
              const engine = cells[3] ? cells[3].textContent.trim() : '';
              
              if (equipment && 
                  equipment !== 'Equipment' && 
                  equipment.length > 2) {
                data.equipmentApplications.push({
                  equipment,
                  year,
                  type,
                  engine
                });
              }
            }
          });
        }
      });

      data.isKit = data.description.toLowerCase().includes('kit');

      return data;
    });

    const filterType = determineFilterType(productData.description);

    const response = {
      success: true,
      data: {
        skuBuscado: sku,
        donaldsonCode: searchResult.donaldsonCode,
        isOEMSearch: sku.toUpperCase() !== searchResult.donaldsonCode.toUpperCase(),
        description: productData.description,
        filterType: filterType,
        isKit: productData.isKit,
        specifications: productData.specifications,
        crossReferences: productData.crossReferences,
        equipmentApplications: productData.equipmentApplications,
        urlFinal: searchResult.productUrl,
        searchUrl: searchUrl,
        timestamp: new Date().toISOString(),
        version: "IMPROVED_SHOW_ALL_v1.1.0"
      }
    };

    console.log('[SUCCESS] Scraping completado');
    console.log(`[INFO] Specs: ${Object.keys(productData.specifications).length}`);
    console.log(`[INFO] Cross-refs: ${productData.crossReferences.length}`);
    console.log(`[INFO] Equipment apps: ${productData.equipmentApplications.length}`);
    
    res.json(response);

  } catch (error) {
    console.error('[ERROR]', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      skuBuscado: sku
    });
  } finally {
    if (browser) await browser.close();
  }
});

function determineFilterType(description) {
  const desc = description.toLowerCase();
  if (desc.includes('air') || desc.includes('aire')) return 'Air';
  if (desc.includes('oil') || desc.includes('huile') || desc.includes('lube') || desc.includes('aceite')) return 'Lube';
  if (desc.includes('fuel') || desc.includes('carburant') || desc.includes('combustible')) return 'Fuel';
  if (desc.includes('hydraulic') || desc.includes('hydraulique')) return 'Hydraulic';
  if (desc.includes('cabin') || desc.includes('cabine')) return 'Cabin';
  if (desc.includes('coolant')) return 'Coolant';
  if (desc.includes('kit')) return 'Kit';
  return 'Unknown';
}

module.exports = router;