const puppeteer = require('puppeteer');

module.exports = async function getDonaldsonAlternatives(productUrl) {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    try {
        await page.goto(productUrl, { waitUntil: 'networkidle2' });

        const productos = await page.evaluate(() => {
            const tabs = document.querySelectorAll('div.tabs .tab a');
            let altTab = null;

            tabs.forEach(tab => {
                if (tab.textContent.includes('Productos Alternativos')) {
                    altTab = tab;
                }
            });

            if (altTab) altTab.click();

            const delay = ms => new Promise(res => setTimeout(res, ms));
            return delay(2000).then(() => {
                const items = [];
                const links = document.querySelectorAll('#alternatesList .product-info');

                links.forEach(link => {
                    const codigo = link.querySelector('.product-number')?.textContent?.trim();
                    const descripcion = link.querySelector('.product-name')?.textContent?.trim();
                    const url = link.querySelector('a')?.href;

                    if (codigo && descripcion && url) {
                        items.push({ codigo, descripcion, url });
                    }
                });

                return items;
            });
        });

        return productos;
    } catch (err) {
        console.error('❌ Puppeteer error:', err);
        return [];
    } finally {
        await browser.close();
    }
};
