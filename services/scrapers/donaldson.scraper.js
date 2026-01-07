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
                '--no-zygote',
                '--single-process'
            ],
            headless: "new" 
        });
        
        const page = await browser.newPage();
        // Bloqueamos imágenes y CSS para ahorrar RAM y evitar el error 500
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        const searchUrl = `https://shop.donaldson.com/store/es-us/search?Ntt=${sku}`;
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

        await page.waitForSelector('.product-title, .product-info-name', { timeout: 20000 });

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
                alternativosReales: Array.from(document.querySelectorAll('.alternative-products .sku-number')).map(el => el.innerText.trim())
            };
        });

        await browser.close();
        return { success: true, data };
    } catch (e) {
        if (browser) await browser.close();
        return { error: "Fallo en barrido real", detail: e.message };
    }
}
module.exports = scrapeDonaldson;
