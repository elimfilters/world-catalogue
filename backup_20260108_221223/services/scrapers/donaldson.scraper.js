const puppeteer = require('puppeteer-core');

async function scrapeDonaldson(code) {
  let browser;
  
  try {
    browser = await puppeteer.connect({
      browserWSEndpoint: `wss://chrome.browserless.io?token=${process.env.BROWSERLESS_TOKEN}`
    });
    
    const page = await browser.newPage();
    
    // PASO 1: Buscar en Donaldson
    const searchUrl = `https://shop.donaldson.com/store/es-us/search?Ntt=${code}*&Ntk=All&originalSearchTerm=${code}*&st=coparts`;
    console.log(`🔍 Buscando: ${code}`);
    
    await page.goto(searchUrl, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    await page.waitForTimeout(2000);
    
    // PASO 2: Buscar link del producto Donaldson
    const productInfo = await page.evaluate((searchCode) => {
      // Buscar links con clase "donaldson-part-details"
      const productLinks = Array.from(document.querySelectorAll('a.donaldson-part-details'));
      
      if (productLinks.length > 0) {
        const firstLink = productLinks[0];
        const match = firstLink.href.match(/\/product\/([A-Z0-9]+)\//);
        
        if (match && match[1]) {
          return {
            found: true,
            donaldsonCode: match[1],
            url: firstLink.href,
            isDirect: match[1].toUpperCase() === searchCode.toUpperCase()
          };
        }
      }
      
      return { found: false };
    }, code.toUpperCase());
    
    if (!productInfo.found) {
      await browser.close();
      return {
        success: false,
        error: 'No Donaldson product found',
        searched: code
      };
    }
    
    console.log(`✅ ${productInfo.isDirect ? 'Código directo' : 'Cross-reference'}: ${code} → ${productInfo.donaldsonCode}`);
    
    // PASO 3: Ir a la página del producto
    await page.goto(productInfo.url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    await page.waitForTimeout(2000);
    
    // PASO 4: Extraer especificaciones
    const productData = await page.evaluate((searchedCode, donCode, wasDirect) => {
      const data = {
        searchedCode: searchedCode,
        donaldsonCode: donCode,
        isDirect: wasDirect,
        filterType: '',
        specifications: {},
        crossReferences: [],
        applications: [],
        images: [],
        description: ''
      };
      
      // Título/tipo de producto
      const titleEl = document.querySelector('h1, .product-title, [class*="title"]');
      if (titleEl) data.filterType = titleEl.textContent.trim();
      
      // Descripción
      const descEl = document.querySelector('.product-description, [class*="description"]');
      if (descEl) data.description = descEl.textContent.trim();
      
      // Especificaciones (tabla o lista)
      const specElements = document.querySelectorAll('table tr, .spec-row, [class*="spec"]');
      specElements.forEach(row => {
        const cells = row.querySelectorAll('td, th, .label, .value');
        if (cells.length >= 2) {
          const key = cells[0].textContent.trim();
          const value = cells[1].textContent.trim();
          if (key && value) {
            data.specifications[key] = value;
          }
        }
      });
      
      // Cross-references
      const crossRefs = document.querySelectorAll('[class*="cross"], [class*="equivalent"]');
      crossRefs.forEach(ref => {
        const text = ref.textContent.trim();
        if (text && text.length > 2) {
          data.crossReferences.push(text);
        }
      });
      
      // Aplicaciones
      const apps = document.querySelectorAll('[class*="application"], [class*="equipment"]');
      apps.forEach(app => {
        const text = app.textContent.trim();
        if (text && text.length > 3) {
          data.applications.push(text);
        }
      });
      
      // Imágenes
      const imgs = document.querySelectorAll('img[src*="product"], img[class*="product"]');
      imgs.forEach(img => {
        if (img.src && !img.src.includes('placeholder') && !img.src.includes('logo')) {
          data.images.push(img.src);
        }
      });
      
      return data;
    }, code, productInfo.donaldsonCode, productInfo.isDirect);
    
    await browser.close();
    
    return {
      success: true,
      data: productData,
      productUrl: productInfo.url
    };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (browser) await browser.close();
    return {
      success: false,
      error: error.message,
      searched: code
    };
  }
}

module.exports = { scrapeDonaldson };