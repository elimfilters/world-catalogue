const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const PORT = process.env.PORT || 8080;

// SCRAPER INTEGRADO PARA EVITAR ERRORES DE RUTA
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
        await page.type('#search-input', sku, { delay: 100 });
        
        const tab = 'a[href*="P551808"]';
        await page.waitForSelector(tab, { timeout: 10000 });
        await page.click(tab);
        await page.waitForSelector('.product-attribute-list', { timeout: 15000 });

        const specs = await page.evaluate(() => {
            const res = {};
            document.querySelectorAll('.product-attribute-list li').forEach(li => {
                const l = li.querySelector('.attr-label')?.innerText.replace(':','').trim();
                const v = li.querySelector('.attr-value')?.innerText.trim();
                if (l) res[l] = v;
            });
            return res;
        });

        await browser.disconnect();
        return { success: true, sku, specs };
    } catch (e) {
        if (browser) await browser.disconnect();
        return { success: false, error: e.message };
    }
}

// MATRIZ DE RUTAS (Directas, sin /api)
app.get('/resuelve/:sku', async (req, res) => {
    const data = await scrapeDonaldson(req.params.sku);
    res.json(data);
});

app.get('/health', (req, res) => res.send('OK'));

app.listen(PORT, () => console.log(`Server en puerto ${PORT}`));