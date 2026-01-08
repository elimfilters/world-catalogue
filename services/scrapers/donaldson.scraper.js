const puppeteer = require('puppeteer');

async function scrapeDonaldson(sku) {
    let browser;
    try {
        console.log("--- CONECTANDO A BROWSERLESS V2 ---");
        const auth = process.env.BROWSERLESS_TOKEN;

        browser = await puppeteer.connect({
            browserWSEndpoint: `wss://chrome.browserless.io?token=${auth}`
        });

        const page = await browser.newPage();

        // Simulación Humana exacta
        await page.goto('https://shop.donaldson.com/store/es-us/home', { waitUntil: 'networkidle2' });
        await page.waitForSelector('#search-input', { timeout: 15000 });
        await page.type('#search-input', sku, { delay: 150 });

        // Esperar el resultado del producto
        const tabSelector = `a[href*="${sku}"]`;
        await page.waitForSelector(tabSelector, { timeout: 15000 });
        await page.click(tabSelector);

        // Esperar la ficha técnica final
        await page.waitForSelector('.product-attribute-list', { timeout: 20000 });

        const data = await page.evaluate(() => {
            // Extraer especificaciones técnicas
            const specs = {};
            document.querySelectorAll('.product-attribute-list li').forEach(li => {
                const key = li.querySelector('.label')?.innerText.trim();
                const val = li.querySelector('.value')?.innerText.trim();
                if (key && val) specs[key] = val;
            });
            
            // Extraer descripción (múltiples selectores posibles)
            const descripcion = 
                document.querySelector('.product-description')?.innerText.trim() ||
                document.querySelector('.product-details')?.innerText.trim() ||
                document.querySelector('.description')?.innerText.trim() ||
                document.querySelector('[class*="description"]')?.innerText.trim() ||
                'Sin descripción disponible';
            
            // Extraer productos alternativos (múltiples selectores posibles)
            const alternativosElements = [
                ...document.querySelectorAll('.alternative-products .sku-number'),
                ...document.querySelectorAll('.cross-reference-item'),
                ...document.querySelectorAll('[data-sku]'),
                ...document.querySelectorAll('.related-product .sku'),
                ...document.querySelectorAll('.compatible-part-number')
            ];
            
            const alternativos = alternativosElements
                .map(e => {
                    return e.innerText?.trim() || e.getAttribute('data-sku')?.trim() || '';
                })
                .filter(Boolean)
                .filter((value, index, self) => self.indexOf(value) === index); // Eliminar duplicados
            
            // Extraer ID real del producto
            const idReal = 
                document.querySelector('.product-title')?.innerText.trim() ||
                document.querySelector('.product-name')?.innerText.trim() ||
                document.querySelector('.sku-number')?.innerText.trim() ||
                'ID no encontrado';
            
            return {
                idReal: idReal,
                descripcion: descripcion,
                especificaciones: specs,
                alternativos: alternativos.length > 0 ? alternativos : [],
                v: "VERSION_TUNEL_ACTIVA"
            };
        });

        await browser.disconnect();
        return { success: true, data };

    } catch (e) {
        if (browser) await browser.disconnect();
        return { 
            success: false, 
            error: "ERROR_V2_TUNEL", 
            detail: e.message 
        };
    }
}

module.exports = scrapeDonaldson;