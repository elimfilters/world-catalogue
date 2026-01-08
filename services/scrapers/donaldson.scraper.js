const puppeteer = require('puppeteer');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeDonaldson(sku) {
    let browser;
    try {
        console.log("=== SCRAPER DONALDSON (DIRECT URL) ===");
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
        
        console.log("Navegando directamente a búsqueda...");
        const searchUrl = `https://shop.donaldson.com/store/en-us/search?Ntt=${sku}`;
        await page.goto(searchUrl, { 
            waitUntil: 'domcontentloaded',
            timeout: 60000 
        });
        
        await delay(4000);
        
        console.log("Buscando link del producto P551808...");
        // Esperar por el link del producto
        await page.waitForSelector('a[href*="P551808"]', { timeout: 20000 });
        
        console.log("Navegando a página del producto...");
        await page.click('a[href*="P551808"]');
        await delay(5000); // Esperar carga completa
        
        console.log("Extrayendo datos...");
        const data = await page.evaluate(() => {
            // Extraer especificaciones
            const specs = {};
            document.querySelectorAll('.product-attribute-list li, .attribute-list li, [class*="specification"] li').forEach(li => {
                const label = li.querySelector('.label, .attr-label, .spec-label, dt')?.innerText.trim().replace(':', '');
                const value = li.querySelector('.value, .attr-value, .spec-value, dd')?.innerText.trim();
                if (label && value) specs[label] = value;
            });
            
            // Extraer descripción
            const descripcion = 
                document.querySelector('.product-description, .description, .product-details')?.innerText.trim() ||
                'Sin descripción disponible';
            
            // Extraer alternativos/cross-reference
            const alternativos = [];
            document.querySelectorAll('.cross-reference-item, .alternative-part, .compatible-part').forEach(el => {
                const text = el.innerText.trim();
                if (text) alternativos.push(text);
            });
            
            // ID del producto
            const idReal = 
                document.querySelector('.product-title, h1.title, .sku-number')?.innerText.trim() ||
                document.querySelector('h1')?.innerText.trim() ||
                'ID no encontrado';
            
            return {
                idReal,
                descripcion,
                especificaciones: specs,
                alternativos: alternativos.length > 0 ? alternativos : [],
                urlFinal: window.location.href,
                timestamp: new Date().toISOString(),
                v: "DIRECT_URL_v1"
            };
        });

        console.log("✅ ÉXITO - Datos extraídos");
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