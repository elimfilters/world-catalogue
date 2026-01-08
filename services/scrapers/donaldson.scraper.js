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
        
        // Simulación Humana exacta que me diste
        await page.goto('https://shop.donaldson.com/store/es-us/home', { waitUntil: 'networkidle2' });
        await page.waitForSelector('#search-input', { timeout: 15000 });
        await page.type('#search-input', sku, { delay: 150 });

        // Esperar el TAB de P551808
        const tabSelector = 'a[href*="P551808"]';
        await page.waitForSelector(tabSelector, { timeout: 15000 });
        await page.click(tabSelector);

        // Esperar la ficha técnica final /80
        await page.waitForSelector('.product-attribute-list', { timeout: 20000 });

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
                v: "VERSION_TUNEL_ACTIVA"
            };
        });

        await browser.disconnect();
        return { success: true, data };

    } catch (e) {
        if (browser) await browser.disconnect();
        return { success: false, error: "ERROR_V2_TUNEL", detail: e.message };
    }
}
module.exports = scrapeDonaldson;
