const puppeteer = require('puppeteer');

async function scrapeDonaldson(sku) {
    let browser;
    try {
        const auth = '2TkgEoerBNEMc8le3f0bf75543d11176c6e74ce2be2c3cd2e';
        browser = await puppeteer.connect({
            browserWSEndpoint: `wss://chrome.browserless.io?token=${auth}`
        });
        const page = await browser.newPage();
        await page.goto('https://shop.donaldson.com/store/es-us/home', { waitUntil: 'networkidle2' });
        await page.waitForSelector('#search-input');
        await page.type('#search-input', sku);
        
        const selector = 'a[href*="P551808"]';
        await page.waitForSelector(selector, { timeout: 10000 });
        await page.click(selector);
        
        await page.waitForSelector('.product-attribute-list', { timeout: 15000 });
        const data = await page.evaluate(() => {
            const specs = {};
            document.querySelectorAll('.product-attribute-list li').forEach(li => {
                const label = li.querySelector('.attr-label')?.innerText.replace(':','').trim();
                const value = li.querySelector('.attr-value')?.innerText.trim();
                if (label) specs[label] = value;
            });
            return specs;
        });
        await browser.disconnect();
        return { success: true, sku, data };
    } catch (e) {
        if (browser) await browser.disconnect();
        return { success: false, error: e.message };
    }
}
module.exports = scrapeDonaldson;
