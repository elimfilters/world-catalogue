const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function scrapeDonaldson(sku) {
    const browser = await puppeteer.launch({ 
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: "new" 
    });
    
    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        
        // Vamos directo a la búsqueda para capturar la ficha técnica
        const searchUrl = `https://shop.donaldson.com/store/es-us/search?Ntt=${sku}`;
        await page.goto(searchUrl, { waitUntil: 'networkidle2' });

        // Esperamos a que cargue la tabla de atributos o el primer producto
        await page.waitForSelector('.product-info-name a, .product-title', { timeout: 10000 });

        // Si es una página de resultados, hacemos click en el primero
        const isResultsPage = await page.$('.product-info-name a');
        if (isResultsPage) {
            await Promise.all([
                page.click('.product-info-name a'),
                page.waitForNavigation({ waitUntil: 'networkidle2' }),
            ]);
        }

        // EXTRAER DATA REAL DE LA FICHA
        const data = await page.evaluate(() => {
            const specs = {};
            document.querySelectorAll('.product-attribute-list li').forEach(li => {
                const label = li.querySelector('.attr-label')?.innerText.replace(':','').trim();
                const value = li.querySelector('.attr-value')?.innerText.trim();
                if (label) specs[label] = value;
            });

            const alternatives = [];
            document.querySelectorAll('.alternative-products .product-card').forEach(card => {
                const altId = card.querySelector('.sku-number')?.innerText.trim();
                if (altId) alternatives.push(altId);
            });

            return {
                idReal: document.querySelector('.product-title')?.innerText.trim(),
                especificaciones: specs,
                alternativosReales: alternatives
            };
        });

        await browser.close();
        return { success: true, data };

    } catch (e) {
        await browser.close();
        return { error: "Bloqueo o timeout en Donaldson", detail: e.message };
    }
}
module.exports = scrapeDonaldson;
