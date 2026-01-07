const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function scrapeDonaldson(sku) {
    let browser;
    try {
        browser = await puppeteer.launch({ 
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome',
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage',
                '--single-process'
            ],
            headless: "new" 
        });
        
        const page = await browser.newPage();
        await page.setDefaultNavigationTimeout(60000); // 60 segundos por si el sitio está lento
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        const searchUrl = `https://shop.donaldson.com/store/es-us/search?Ntt=${sku}`;
        await page.goto(searchUrl, { waitUntil: 'networkidle2' });

        // Esperar a que el contenido real aparezca
        await page.waitForSelector('.product-title, .product-info-name', { timeout: 20000 });

        const data = await page.evaluate(() => {
            const specs = {};
            document.querySelectorAll('.product-attribute-list li').forEach(li => {
                const label = li.querySelector('.attr-label')?.innerText.replace(':','').trim();
                const value = li.querySelector('.attr-value')?.innerText.trim();
                if (label) specs[label] = value;
            });

            const alternatives = [];
            document.querySelectorAll('.alternative-products .sku-number').forEach(el => {
                alternatives.push(el.innerText.trim());
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
        if (browser) await browser.close();
        return { error: "Error en el barrido", detail: e.message };
    }
}
module.exports = scrapeDonaldson;
