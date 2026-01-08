const puppeteer = require('puppeteer');

// Función helper para delays
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeDonaldson(sku) {
    let browser;
    try {
        console.log("=== INICIANDO SCRAPER DONALDSON ===");
        console.log("SKU solicitado:", sku);
        
        const auth = process.env.BROWSERLESS_TOKEN;
        if (!auth) {
            throw new Error("BROWSERLESS_TOKEN no está configurado");
        }

        console.log("Conectando a Browserless...");
        browser = await puppeteer.connect({
            browserWSEndpoint: `wss://chrome.browserless.io?token=${auth}`
        });

        const page = await browser.newPage();
        
        // User agent más realista
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        console.log("Navegando a homepage...");
        await page.goto('https://shop.donaldson.com/store/es-us/home', { 
            waitUntil: 'networkidle0',
            timeout: 30000 
        });
        
        console.log("Esperando carga completa...");
        await delay(3000);
        
        // Intentar múltiples selectores para el input de búsqueda
        console.log("Buscando input de búsqueda...");
        const searchInput = await page.$('#search-input') || 
                           await page.$('input[type="search"]') ||
                           await page.$('input[placeholder*="Search"]') ||
                           await page.$('input[name="search"]');
        
        if (!searchInput) {
            // Si no encontramos el input, intentamos URL directa
            console.log("Input no encontrado, intentando URL directa...");
            const directUrl = `https://shop.donaldson.com/store/es-us/search?Ntt=${sku}`;
            await page.goto(directUrl, { waitUntil: 'networkidle0', timeout: 30000 });
        } else {
            console.log("Input encontrado, escribiendo SKU...");
            await searchInput.type(sku, { delay: 100 });
            await page.keyboard.press('Enter');
            await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });
        }

        console.log("Esperando resultados...");
        await delay(3000);
        
        // Buscar el link del producto
        console.log("Buscando link del producto...");
        const productLink = await page.$(`a[href*="${sku}"]`) ||
                           await page.$('.product-item a') ||
                           await page.$('.search-result-item a');
        
        if (!productLink) {
            throw new Error(`No se encontró el producto con SKU: ${sku}`);
        }
        
        console.log("Haciendo click en producto...");
        await productLink.click();
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });

        console.log("Esperando página de producto...");
        await delay(3000);

        console.log("Extrayendo datos...");
        const data = await page.evaluate(() => {
            // Extraer especificaciones técnicas
            const specs = {};
            const specsList = document.querySelectorAll('.product-attribute-list li, .specifications li, [class*="spec"] li');
            specsList.forEach(li => {
                const key = li.querySelector('.label, .spec-name, dt')?.innerText.trim();
                const val = li.querySelector('.value, .spec-value, dd')?.innerText.trim();
                if (key && val) specs[key] = val;
            });
            
            // Extraer descripción
            const descripcion = 
                document.querySelector('.product-description')?.innerText.trim() ||
                document.querySelector('.product-details')?.innerText.trim() ||
                document.querySelector('.description')?.innerText.trim() ||
                document.querySelector('[class*="description"]')?.innerText.trim() ||
                'Sin descripción disponible';
            
            // Extraer productos alternativos
            const alternativosElements = [
                ...document.querySelectorAll('.alternative-products .sku-number'),
                ...document.querySelectorAll('.cross-reference-item'),
                ...document.querySelectorAll('[data-sku]'),
                ...document.querySelectorAll('.related-product .sku'),
                ...document.querySelectorAll('.compatible-part-number')
            ];
            
            const alternativos = alternativosElements
                .map(e => e.innerText?.trim() || e.getAttribute('data-sku')?.trim() || '')
                .filter(Boolean)
                .filter((value, index, self) => self.indexOf(value) === index);
            
            // Extraer ID real del producto
            const idReal = 
                document.querySelector('.product-title')?.innerText.trim() ||
                document.querySelector('.product-name')?.innerText.trim() ||
                document.querySelector('.sku-number')?.innerText.trim() ||
                document.querySelector('h1')?.innerText.trim() ||
                'ID no encontrado';
            
            return {
                idReal: idReal,
                descripcion: descripcion,
                especificaciones: specs,
                alternativos: alternativos.length > 0 ? alternativos : [],
                v: "VERSION_TUNEL_ACTIVA_DEBUG"
            };
        });

        console.log("Datos extraídos exitosamente:", data);
        await browser.disconnect();
        return { success: true, data };

    } catch (e) {
        console.error("ERROR EN SCRAPER:", e.message);
        if (browser) await browser.disconnect();
        return { 
            success: false, 
            error: "ERROR_V2_TUNEL", 
            detail: e.message 
        };
    }
}

module.exports = scrapeDonaldson;