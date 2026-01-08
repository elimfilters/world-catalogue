const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function scrapeDonaldson(sku) {
    let browser;
    try {
        // Usamos la variable de entorno que definimos en nixpacks o el fallback de chromium
        const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';
        
        browser = await puppeteer.launch({ 
            executablePath: executablePath,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process'],
            headless: "new"
        });
        
        const page = await browser.newPage();
        await page.setDefaultNavigationTimeout(60000);
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/119.0.0.0 Safari/537.36');

        const url = `https://shop.donaldson.com/store/es-us/search?Ntt=${sku}`;
        await page.goto(url, { waitUntil: 'networkidle2' });

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
                alternativos: Array.from(document.querySelectorAll('.alternative-products .sku-number')).map(e => e.innerText.trim())
            };
        });

        await browser.close();
        return { success: true, data };
    } catch (e) {
        if (browser) await browser.close();
        return { success: false, error: "Fallo de visión", detail: e.message };
    }
}
module.exports = scrapeDonaldson;
