const puppeteer = require('puppeteer');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeDonaldson(sku) {
    let browser;
    try {
        console.log("=== SCRAPER DONALDSON - SPECS TAB ===");
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
        
        // IR DIRECTO A LA PESTAÑA DE ESPECIFICACIONES (/80)
        console.log("Navegando a pestaña de especificaciones...");
        const specsUrl = 'https://shop.donaldson.com/store/es-us/product/P551808/80';
        
        await page.goto(specsUrl, { 
            waitUntil: 'networkidle0',
            timeout: 60000 
        });
        
        console.log("Esperando carga completa...");
        await delay(5000);
        
        console.log("Extrayendo especificaciones técnicas...");
        const data = await page.evaluate((skuBuscado) => {
            // Extraer especificaciones técnicas
            const specs = {};
            
            // Intentar múltiples patrones de selectores
            const specSelectors = [
                '.product-attribute-list li',
                '.attribute-list li',
                '.specifications-list li',
                '.spec-item',
                'table.specs tr',
                'dl.attributes dt',
                '[class*="specification"] li',
                '[class*="attribute"] li'
            ];
            
            specSelectors.forEach(selector => {
                document.querySelectorAll(selector).forEach(item => {
                    let label, value;
                    
                    // Para elementos <dt> y <dd>
                    if (item.tagName === 'DT') {
                        label = item.innerText.trim();
                        const dd = item.nextElementSibling;
                        value = dd?.innerText.trim();
                    }
                    // Para filas de tabla
                    else if (item.tagName === 'TR') {
                        const cells = item.querySelectorAll('td');
                        if (cells.length >= 2) {
                            label = cells[0].innerText.trim();
                            value = cells[1].innerText.trim();
                        }
                    }
                    // Para elementos <li> con estructura interna
                    else {
                        label = item.querySelector('.label, .attr-label, .spec-label, .name, strong, b')?.innerText.trim().replace(':', '');
                        value = item.querySelector('.value, .attr-value, .spec-value, .data, span:not(.label)')?.innerText.trim();
                        
                        // Si no encuentra con selectores, intentar dividir por ":"
                        if (!label && !value && item.innerText.includes(':')) {
                            const parts = item.innerText.split(':');
                            if (parts.length === 2) {
                                label = parts[0].trim();
                                value = parts[1].trim();
                            }
                        }
                    }
                    
                    if (label && value && label.length > 0 && value.length > 0) {
                        specs[label] = value;
                    }
                });
            });
            
            // Extraer descripción
            const descripcionElements = [
                document.querySelector('.product-description'),
                document.querySelector('.description'),
                document.querySelector('.product-details'),
                document.querySelector('[class*="description"]'),
                document.querySelector('.overview')
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
                '[class*="alternative"]',
                '.competitor-part'
            ];
            
            altSelectors.forEach(selector => {
                document.querySelectorAll(selector).forEach(el => {
                    const text = el.innerText.trim();
                    if (text && text.length < 50 && !alternativos.includes(text)) {
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
                cantidadEspecificaciones: Object.keys(specs).length,
                timestamp: new Date().toISOString(),
                v: "SPECS_TAB_v1"
            };
        }, sku);

        console.log("✅ Extracción completada");
        console.log("Especificaciones encontradas:", data.cantidadEspecificaciones);
        
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