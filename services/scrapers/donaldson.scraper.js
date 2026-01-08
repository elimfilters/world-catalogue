const puppeteer = require('puppeteer');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeDonaldson(sku) {
    let browser;
    try {
        console.log("=== SCRAPER DONALDSON ===");
        console.log("SKU buscado:", sku);
        
        const auth = process.env.BROWSERLESS_TOKEN;
        if (!auth) {
            throw new Error("BROWSERLESS_TOKEN no configurado");
        }

        browser = await puppeteer.connect({
            browserWSEndpoint: `wss://chrome.browserless.io?token=${auth}`
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // ESTRATEGIA: Ir directamente a la página del producto P551808
        console.log("Navegando directamente a la página del producto...");
        const productUrl = 'https://shop.donaldson.com/store/en-us/product/P551808';
        
        await page.goto(productUrl, { 
            waitUntil: 'domcontentloaded',
            timeout: 60000 
        });
        
        console.log("Esperando carga completa...");
        await delay(5000);
        
        console.log("Extrayendo datos del producto...");
        const data = await page.evaluate((skuBuscado) => {
            // Extraer especificaciones técnicas
            const specs = {};
            const allLists = [
                ...document.querySelectorAll('.product-attribute-list li'),
                ...document.querySelectorAll('.attribute-list li'),
                ...document.querySelectorAll('.specifications li'),
                ...document.querySelectorAll('[class*="spec"] li'),
                ...document.querySelectorAll('dl dt')
            ];
            
            allLists.forEach(item => {
                let label, value;
                
                if (item.tagName === 'DT') {
                    label = item.innerText.trim();
                    const dd = item.nextElementSibling;
                    value = dd?.innerText.trim();
                } else {
                    label = item.querySelector('.label, .attr-label, .spec-label, strong')?.innerText.trim().replace(':', '');
                    value = item.querySelector('.value, .attr-value, .spec-value, span')?.innerText.trim();
                }
                
                if (label && value) {
                    specs[label] = value;
                }
            });
            
            // Extraer descripción
            const descripcionElements = [
                document.querySelector('.product-description'),
                document.querySelector('.description'),
                document.querySelector('.product-details'),
                document.querySelector('[class*="description"]')
            ];
            
            const descripcion = descripcionElements
                .find(el => el && el.innerText.trim().length > 10)
                ?.innerText.trim() || 'Sin descripción disponible';
            
            // Extraer productos alternativos
            const alternativos = [];
            const altSelectors = [
                '.cross-reference-item',
                '.alternative-part',
                '.compatible-part',
                '[class*="cross-ref"]',
                '[class*="alternative"]'
            ];
            
            altSelectors.forEach(selector => {
                document.querySelectorAll(selector).forEach(el => {
                    const text = el.innerText.trim();
                    if (text && !alternativos.includes(text)) {
                        alternativos.push(text);
                    }
                });
            });
            
            // ID del producto
            const idReal = 
                document.querySelector('.product-title')?.innerText.trim() ||
                document.querySelector('h1.title')?.innerText.trim() ||
                document.querySelector('.sku-number')?.innerText.trim() ||
                document.querySelector('h1')?.innerText.trim() ||
                'P551808';
            
            return {
                skuBuscado: skuBuscado,
                idReal: idReal,
                descripcion: descripcion,
                especificaciones: specs,
                alternativos: alternativos,
                urlFinal: window.location.href,
                timestamp: new Date().toISOString(),
                v: "DIRECT_PRODUCT_URL_v1"
            };
        }, sku);

        console.log("✅ Datos extraídos exitosamente");
        console.log("ID Real:", data.idReal);
        console.log("Specs encontradas:", Object.keys(data.especificaciones).length);
        
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