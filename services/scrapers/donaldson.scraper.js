const puppeteer = require('puppeteer');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeDonaldson(sku) {
    let browser;
    try {
        console.log("=== SCRAPER DONALDSON (REAL SELECTORS) ===");
        console.log("SKU:", sku);
        
        const auth = process.env.BROWSERLESS_TOKEN;
        if (!auth) {
            throw new Error("BROWSERLESS_TOKEN no configurado");
        }

        browser = await puppeteer.connect({
            browserWSEndpoint: `wss://chrome.browserless.io?token=${auth}`
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        console.log("PASO 1: Navegando a homepage...");
        await page.goto('https://shop.donaldson.com/store/en-us/home', { 
            waitUntil: 'networkidle0',
            timeout: 45000 
        });
        
        await delay(2000);
        
        console.log("PASO 2: Buscando input real...");
        // Usar el selector REAL que encontramos
        const searchInput = await page.$('#id_label_multiple_box') || 
                           await page.$('#id_label_multiple_header');
        
        if (!searchInput) {
            throw new Error("No se encontró el input de búsqueda");
        }
        
        console.log("PASO 3: Escribiendo SKU...");
        await searchInput.type(sku, { delay: 100 });
        
        console.log("PASO 4: Enviando búsqueda...");
        await Promise.all([
            page.keyboard.press('Enter'),
            page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 45000 })
        ]);
        
        await delay(3000);
        
        console.log("PASO 5: Buscando resultado del producto...");
        // El producto aparece como link con el SKU real (P551808)
        const productSelector = 'a[href*="P551808"]';
        await page.waitForSelector(productSelector, { timeout: 15000 });
        
        console.log("PASO 6: Haciendo click en producto...");
        await Promise.all([
            page.click(productSelector),
            page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 45000 })
        ]);
        
        await delay(3000);
        
        console.log("PASO 7: Extrayendo datos...");
        const data = await page.evaluate(() => {
            // Extraer especificaciones
            const specs = {};
            const specsList = document.querySelectorAll('.product-attribute-list li, .attribute-list li, [class*="attribute"] li');
            specsList.forEach(li => {
                const label = li.querySelector('.label, .attr-label, dt')?.innerText.trim().replace(':', '');
                const value = li.querySelector('.value, .attr-value, dd')?.innerText.trim();
                if (label && value) specs[label] = value;
            });
            
            // Extraer descripción
            const descripcion = 
                document.querySelector('.product-description')?.innerText.trim() ||
                document.querySelector('.description')?.innerText.trim() ||
                'Sin descripción';
            
            // Extraer alternativos
            const alternativos = Array.from(
                document.querySelectorAll('.cross-reference-item, .alternative-part, [class*="cross-ref"]')
            ).map(el => el.innerText.trim()).filter(Boolean);
            
            // ID del producto
            const idReal = 
                document.querySelector('.product-title, h1, .sku-number')?.innerText.trim() ||
                'ID no encontrado';
            
            return {
                idReal,
                descripcion,
                especificaciones: specs,
                alternativos: alternativos.length > 0 ? alternativos : [],
                urlFinal: window.location.href,
                v: "REAL_SELECTORS_v1"
            };
        });

        console.log("✅ Datos extraídos:", data);
        await browser.disconnect();
        return { success: true, data };

    } catch (e) {
        console.error("❌ ERROR:", e.message);
        if (browser) await browser.disconnect();
        return { 
            success: false, 
            error: "ERROR_SCRAPER", 
            detail: e.message 
        };
    }
}

module.exports = scrapeDonaldson;