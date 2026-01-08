const express = require('express');
const puppeteer = require('puppeteer');
const app = express();

// Blindaje del Scraper: No depende de rutas locales, solo del túnel
async function scrape(sku) {
    let browser;
    try {
        browser = await puppeteer.connect({
            browserWSEndpoint: `wss://chrome.browserless.io?token=2TkgEoerBNEMc8le3f0bf75543d11176c6e74ce2be2c3cd2e`
        });
        const page = await browser.newPage();
        await page.goto('https://shop.donaldson.com/store/es-us/home', { waitUntil: 'networkidle2' });
        
        await page.waitForSelector('#search-input');
        await page.type('#search-input', sku, { delay: 100 });
        
        const tab = 'a[href*="P551808"]';
        await page.waitForSelector(tab, { timeout: 10000 });
        await page.click(tab);
        
        await page.waitForSelector('.product-attribute-list', { timeout: 15000 });
        
        const data = await page.evaluate(() => {
            const specs = {};
            document.querySelectorAll('.product-attribute-list li').forEach(li => {
                const l = li.querySelector('.attr-label')?.innerText.replace(':','').trim();
                const v = li.querySelector('.attr-value')?.innerText.trim();
                if (l) specs[l] = v;
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

// Rutas sin prefijos para evitar el 404
app.get('/resuelve/:sku', async (req, res) => {
    const result = await scrape(req.params.sku);
    res.json(result);
});

// Ruta raíz para confirmar despliegue
app.get('/', (req, res) => res.send('MOTOR_LISTO_V1'));

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => console.log(`Puerto ${PORT}`));