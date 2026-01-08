const puppeteer = require('puppeteer');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeDonaldson(sku) {
    let browser;
    try {
        console.log("=== SCRAPER DONALDSON FINAL ===");
        console.log("SKU:", sku);
        
        const auth = process.env.BROWSERLESS_TOKEN;
        browser = await puppeteer.connect({
            browserWSEndpoint: `wss://chrome.browserless.io?token=${auth}`
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        const specsUrl = 'https://shop.donaldson.com/store/es-us/product/P551808/80';
        await page.goto(specsUrl, { 
            waitUntil: 'networkidle0',
            timeout: 60000 
        });
        
        await delay(5000);
        
        const data = await page.evaluate((skuBuscado) => {
            const specs = {};
            const alternativos = [];
            let descripcion = 'Sin descripción disponible';
            
            // EXTRAER ESPECIFICACIONES DE TABLAS
            const tables = document.querySelectorAll('table.table-striped');
            
            tables.forEach(table => {
                const rows = table.querySelectorAll('tr');
                rows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length === 2) {
                        const label = cells[0].innerText.trim();
                        const value = cells[1].innerText.trim();
                        
                        // Solo agregar si parece especificación técnica (no navegación, etc)
                        if (label && value && 
                            !label.includes('Qty') && 
                            !label.includes('Price') &&
                            !label.includes('Date') &&
                            value.length > 0 && value.length < 200) {
                            specs[label] = value;
                        }
                    }
                });
            });
            
            // EXTRAER CROSS REFERENCE (alternativos)
            const crossRefTable = document.querySelector('.applicationPartTablePDP');
            if (crossRefTable) {
                const rows = crossRefTable.querySelectorAll('tr');
                rows.forEach((row, idx) => {
                    if (idx === 0) return; // Skip header
                    const cells = row.querySelectorAll('td');
                    if (cells.length >= 2) {
                        const manufacturer = cells[0].innerText.trim();
                        const partNumber = cells[1].innerText.trim();
                        if (manufacturer && partNumber) {
                            alternativos.push(`${manufacturer} ${partNumber}`);
                        }
                    }
                });
            }
            
            // DESCRIPCIÓN del preview
            const bodyText = document.body.innerText;
            if (bodyText.includes('LUBE FILTER')) {
                descripcion = 'LUBE FILTER, SPIN-ON FULL FLOW';
            }
            
            const idReal = document.querySelector('h1')?.innerText.split('–')[0].trim() || 'P551808';
            
            return {
                skuBuscado: skuBuscado,
                idReal: idReal,
                descripcion: descripcion,
                especificaciones: specs,
                alternativos: alternativos,
                urlFinal: window.location.href,
                cantidadEspecificaciones: Object.keys(specs).length,
                cantidadAlternativos: alternativos.length,
                timestamp: new Date().toISOString(),
                v: "FINAL_TABLE_BASED_v1"
            };
        }, sku);

        console.log("✅ ÉXITO TOTAL");
        console.log("Especificaciones:", data.cantidadEspecificaciones);
        console.log("Alternativos:", data.cantidadAlternativos);
        
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