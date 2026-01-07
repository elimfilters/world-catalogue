const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function scrapeDonaldson(sku) {
    let browser;
    try {
        browser = await puppeteer.launch({ 
            executablePath: '/usr/bin/google-chrome',
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--single-process'
            ]
        });
        
        const page = await browser.newPage();
        await page.setDefaultNavigationTimeout(30000);
        
        // Bloqueo total de multimedia para ahorrar RAM
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        const searchUrl = `https://shop.donaldson.com/store/es-us/search?Ntt=${sku}`;
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });

        // Verificamos si estamos en resultados o ficha directa
        await page.waitForSelector('.product-title, .product-info-name', { timeout: 15000 });

        const data = await page.evaluate(() => {
            const specs = {};
            document.querySelectorAll('.product-attribute-list li').forEach(li => {
                const label = li.querySelector('.attr-label')?.innerText.replace(':','').trim();
                const value = li.querySelector('.attr-value')?.innerText.trim();
                if (label) specs[label] = value;
            });
            return {
                idReal: document.querySelector('.product-title')?.innerText.trim(),
                especificaciones: specs,
                alternativos: Array.from(document.querySelectorAll('.alternative-products .sku-number')).map(e => e.innerText.trim())
            };
        });

        await browser.close();
        return { success: true, data };
    } catch (e) {
        if (browser) await browser.close();
        return { error: "Fallo de visión", detail: e.message };
    }
}
module.exports = scrapeDonaldson;
