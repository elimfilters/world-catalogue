const puppeteer = require('puppeteer-core');

exports.testFullExtraction = async (req, res) => {
    const { filterCode } = req.body;
    let browser;
    try {
        browser = await puppeteer.launch();
        const page = await browser.newPage();
        
        // 1. Home y Búsqueda
        await page.goto(`https://shop.donaldson.com/store/es-us/search?Ntt=${filterCode}`);
        
        // 2. Clic en el resultado del Tab
        await page.waitForSelector('.search-result-item');
        await page.click('.search-result-item a');

        // 3. Extracción de los 4 Tabs con "Mostrar Más"
        const tabs = ['.prodSpecInfoDiv', '.ListCrossReferenceDetailPageComp', '.ListPartDetailPageComp'];
        for (let tab of tabs) {
            await page.click(`a[data-target="${tab}"]`);
            const showMore = await page.$('button#showMoreProductSpecsButton, button#showMorePdpListButton');
            if (showMore) await showMore.click();
            await page.waitForTimeout(500); // Pausa humana
        }

        const data = await page.evaluate(() => {
            // Lógica para limpiar nombres de fabricantes en Cross Reference
            const cleanRefs = Array.from(document.querySelectorAll('.ListCrossReferenceDetailPageComp .part-number'))
                                   .map(el => el.innerText.replace(/[a-zA-Z]+\s/g, '').trim());
            return {
                skuBase: document.querySelector('.base-part-number')?.innerText,
                specs: document.querySelector('.prodSpecInfoDiv')?.innerText,
                crossRefs: cleanRefs.join(', '),
                alternativos: Array.from(document.querySelectorAll('.preAlternate')).map(el => el.innerText)
            };
        });

        await browser.close();
        res.json(data);
    } catch (err) {
        if (browser) await browser.close();
        res.status(500).json({ error: "Fallo en navegación humana: " + err.message });
    }
};
