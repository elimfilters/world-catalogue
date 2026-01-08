// routes/scraperRoutes.js - COMPLETE DYNAMIC VERSION

const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer-core');

// ==========================================
// ENDPOINT DINÁMICO: Buscar cualquier SKU
// ==========================================
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
    console.log(`🔍 Iniciando búsqueda para SKU: ${sku}`);

    // Conectar a Browserless
    browser = await puppeteer.connect({
      browserWSEndpoint: `wss://production-sfo.browserless.io?token=${browserlessToken}&blockAds=true&stealth=true`
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    // PASO 1: Buscar el SKU en Donaldson
    console.log('📡 Buscando en Donaldson...');
    const searchUrl = `https://shop.donaldson.com/store/en-us/search?text=${sku}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    // Esperar resultados
    await page.waitForSelector('a[href*="/product/"]', { timeout: 10000 });

    // Obtener el primer resultado (producto principal)
    const productLink = await page.evaluate(() => {
      const firstProduct = document.querySelector('a[href*="/product/"]');
      return firstProduct ? firstProduct.href : null;
    });

    if (!productLink) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado en Donaldson',
        skuBuscado: sku
      });
    }

    console.log(`✅ Producto encontrado: ${productLink}`);

    // PASO 2: Navegar a la página del producto
    await page.goto(productLink, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForSelector('body', { timeout: 10000 });

    // PASO 3: Extraer TODA la información
    const productData = await page.evaluate(() => {
      const data = {
        isKit: false,
        donaldsonCode: '',
        description: '',
        specifications: {},
        kitComponents: [],
        variants: [],
        crossReferences: [],
        equipmentApplications: []
      };

      // ========================================
      // 1. INFORMACIÓN BÁSICA
      // ========================================
      const titleElement = document.querySelector('h4');
      if (titleElement) {
        const titleText = titleElement.textContent.trim();
        const codeMatch = titleText.match(/^([A-Z0-9-]+)/);
        data.donaldsonCode = codeMatch ? codeMatch[1] : titleText;
      }

      const descElement = document.querySelector('h6, .product-description');
      if (descElement) {
        data.description = descElement.textContent.trim();
      }

      // ========================================
      // 2. DETECTAR SI ES UN KIT
      // ========================================
      const kitComponentsSection = document.body.innerHTML;
      const hasKitComponents = kitComponentsSection.includes('FILTRE À') || 
                               kitComponentsSection.includes('FILTER,') ||
                               kitComponentsSection.includes('(1) -');

      if (data.description.toLowerCase().includes('kit') && hasKitComponents) {
        data.isKit = true;

        // Extraer componentes del kit
        const componentLinks = document.querySelectorAll('a[href*="/product/"]');
        const seenComponents = new Set();

        componentLinks.forEach(link => {
          const href = link.href;
          const text = link.textContent.trim();
          
          // Buscar cantidad en el texto anterior
          const parent = link.parentElement;
          const parentText = parent ? parent.textContent : '';
          const qtyMatch = parentText.match(/\((\d+)\)\s*-/);
          const quantity = qtyMatch ? parseInt(qtyMatch[1]) : 1;

          // Extraer código del producto
          const codeMatch = href.match(/\/product\/([A-Z0-9-]+)\//);
          if (codeMatch && !seenComponents.has(codeMatch[1])) {
            seenComponents.add(codeMatch[1]);
            
            // Buscar descripción cerca del link
            let description = text;
            const nextElement = link.nextElementSibling;
            if (nextElement && nextElement.textContent.length > description.length) {
              description = nextElement.textContent.trim();
            }

            data.kitComponents.push({
              quantity: quantity,
              partNumber: codeMatch[1],
              description: description,
              url: href
            });
          }
        });
      }

      // ========================================
      // 3. ESPECIFICACIONES TÉCNICAS
      // ========================================
      const allText = document.body.innerText;
      const specs = {};

      // Extraer specs comunes
      const patterns = {
        'Thread Size': /Thread Size[:\s]+([^\n]+)/i,
        'Outer Diameter': /Outer Diameter[:\s]+([^\n]+)/i,
        'Inner Diameter': /Inner Diameter[:\s]+([^\n]+)/i,
        'Height': /(?:Height|Length)[:\s]+([^\n]+)/i,
        'Gasket OD': /Gasket OD[:\s]+([^\n]+)/i,
        'Gasket ID': /Gasket ID[:\s]+([^\n]+)/i,
        'Efficiency 99%': /Efficiency 99%[:\s]+([^\n]+)/i,
        'Media Type': /Media Type[:\s]+([^\n]+)/i,
        'Collapse Burst': /Collapse[\/\s]+Burst[:\s]+([^\n]+)/i,
        'Type': /Type[:\s]+([^\n]+)/i,
        'Style': /Style[:\s]+([^\n]+)/i,
        'Rated Flow': /Rated Flow[:\s]+([^\n]+)/i,
        'Max Pressure': /Max(?:imum)? Pressure[:\s]+([^\n]+)/i,
        'Burst Pressure': /Burst Pressure[:\s]+([^\n]+)/i,
        'Beta Ratio': /Beta Ratio[:\s]+([^\n]+)/i,
        'ISO': /ISO[:\s]+([^\n]+)/i
      };

      for (const [key, pattern] of Object.entries(patterns)) {
        const match = allText.match(pattern);
        if (match && match[1]) {
          specs[key] = match[1].trim();
        }
      }

      data.specifications = specs;

      // ========================================
      // 4. PRODUCTOS ALTERNATIVOS / VARIANTES
      // ========================================
      const variantCards = document.querySelectorAll('[class*="variant"], [class*="alternative"]');
      const seenVariants = new Set([data.donaldsonCode]);

      variantCards.forEach(card => {
        const codeElement = card.querySelector('h5, [class*="code"]');
        const descElement = card.querySelector('h6, [class*="description"]');
        const noteElement = card.querySelector('p, [class*="note"]');

        if (codeElement) {
          const code = codeElement.textContent.trim();
          if (!seenVariants.has(code)) {
            seenVariants.add(code);
            data.variants.push({
              code: code,
              description: descElement ? descElement.textContent.trim() : '',
              note: noteElement ? noteElement.textContent.trim() : ''
            });
          }
        }
      });

      // También buscar en texto plano
      const variantPattern = /([A-Z]{2,}[0-9]{4,})\s*-\s*([^\n]+)/g;
      let match;
      while ((match = variantPattern.exec(allText)) !== null) {
        const code = match[1];
        if (!seenVariants.has(code) && code !== data.donaldsonCode) {
          seenVariants.add(code);
          data.variants.push({
            code: code,
            description: match[2].trim(),
            note: ''
          });
        }
      }

      // ========================================
      // 5. CROSS REFERENCES (Tabla)
      // ========================================
      const crossRefTable = document.querySelector('table');
      if (crossRefTable) {
        const rows = crossRefTable.querySelectorAll('tr');
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 2) {
            const manufacturer = cells[0].textContent.trim();
            const partNumber = cells[1].textContent.trim();
            const notes = cells[2] ? cells[2].textContent.trim() : '';

            if (manufacturer && partNumber) {
              data.crossReferences.push({
                manufacturer: manufacturer,
                partNumber: partNumber,
                notes: notes
              });
            }
          }
        });
      }

      // ========================================
      // 6. EQUIPMENT APPLICATIONS
      // ========================================
      const equipmentTable = document.querySelectorAll('table')[1]; // Segunda tabla
      if (equipmentTable) {
        const rows = equipmentTable.querySelectorAll('tr');
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 5) {
            data.equipmentApplications.push({
              equipment: cells[0].textContent.trim(),
              year: cells[1].textContent.trim(),
              type: cells[2].textContent.trim(),
              engine: cells[4].textContent.trim()
            });
          }
        });
      }

      return data;
    });

    // PASO 4: Determinar tipo de filtro
    const filterType = determineFilterType(productData.description);

    // PASO 5: Construir respuesta
    const response = {
      success: true,
      data: {
        skuBuscado: sku,
        donaldsonCode: productData.donaldsonCode,
        description: productData.description,
        filterType: filterType,
        isKit: productData.isKit,
        specifications: productData.specifications,
        kitComponents: productData.kitComponents,
        variants: productData.variants,
        crossReferences: productData.crossReferences,
        equipmentApplications: productData.equipmentApplications,
        urlFinal: productLink,
        timestamp: new Date().toISOString(),
        version: "DYNAMIC_COMPLETE_v1"
      }
    };

    console.log('✅ Scraping completado exitosamente');
    res.json(response);

  } catch (error) {
    console.error('❌ Error en scraping:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      skuBuscado: sku
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

// ==========================================
// FUNCIÓN AUXILIAR: Determinar tipo de filtro
// ==========================================
function determineFilterType(description) {
  const desc = description.toLowerCase();
  
  if (desc.includes('air') || desc.includes('aire')) return 'Air';
  if (desc.includes('lube') || desc.includes('oil') || desc.includes('huile') || desc.includes('aceite')) return 'Lube';
  if (desc.includes('fuel') || desc.includes('carburant') || desc.includes('combustible')) return 'Fuel';
  if (desc.includes('hydraulic') || desc.includes('hydraulique') || desc.includes('hidráulico')) return 'Hydraulic';
  if (desc.includes('cabin') || desc.includes('cabine') || desc.includes('cabina')) return 'Cabin';
  if (desc.includes('coolant') || desc.includes('líquido de refrig')) return 'Coolant';
  if (desc.includes('transmission') || desc.includes('transmisión')) return 'Transmission';
  if (desc.includes('kit')) return 'Kit';
  
  return 'Unknown';
}

module.exports = router;