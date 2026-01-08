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
        
        const tab = 'a[href*="P551808"]';
        await page.waitForSelector(tab, { timeout: 10000 });
        await page.click(tab);
        
        await page.waitForSelector('.product-attribute-list', { timeout: 15000 });
        const specs = await page.evaluate(() => {
            const data = {};
            document.querySelectorAll('.product-attribute-list li').forEach(li => {
                const l = li.querySelector('.attr-label')?.innerText.replace(':','').trim();
                const v = li.querySelector('.attr-value')?.innerText.trim();
                if (l) data[l] = v;
            });
            return data;
        });
        await browser.disconnect();
        return { success: true, sku, data: specs };
    } catch (e) {
        if (browser) await browser.disconnect();
        return { success: false, error: e.message };
    }
}
module.exports = scrapeDonaldson;
