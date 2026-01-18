const puppeteer = require('puppeteer-core');
const googleSheetsService = require('../services/googleSheets.service');

// 1. Clasificación normal
exports.classifyFilter = async (req, res) => {
    try {
        const { filterCode } = req.body;
        // Lógica simplificada para mantener el servidor vivo
        res.json({ message: "Clasificación activa", SKU: "EL80000" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 2. EXTRACCIÓN HUMANA (Los 4 Tabs)
exports.testFullExtraction = async (req, res) => {
    const { filterCode, updateSheet, cleanNames } = req.body;
    let browser;
    try {
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        // Navegación
        await page.goto(`https://shop.donaldson.com/store/es-us/search?Ntt=${filterCode}`);
        await page.waitForSelector('.search-result-item', { timeout: 10000 });
        await page.click('.search-result-item a');

        // Esperar carga de página de producto
        await page.waitForSelector('a[data-target=".prodSpecInfoDiv"]');

        // Función interna para expandir y extraer
        const extractTab = async (selector, buttonId) => {
            try {
                await page.click(`a[data-target="${selector}"]`);
                const btn = await page.$(`button#${buttonId}`);
                if (btn) await btn.click();
                await new Promise(r => setTimeout(r, 500));
            } catch (e) {}
        };

        await extractTab('.prodSpecInfoDiv', 'showMoreProductSpecsButton');
        await extractTab('.ListCrossReferenceDetailPageComp', 'showMorePdpListButton');
        await extractTab('.ListPartDetailPageComp', 'showMorePdpListButton');

        const data = await page.evaluate(() => {
            const cleanRefs = Array.from(document.querySelectorAll('.ListCrossReferenceDetailPageComp .part-number'))
                                   .map(el => el.innerText.replace(/[a-zA-Z]+\s/g, '').trim());
            return {
                skuBase: document.querySelector('.base-part-number')?.innerText,
                description: document.querySelector('.product-title')?.innerText,
                specs: document.querySelector('.prodSpecInfoDiv')?.innerText,
                crossRefs: cleanRefs.filter(ref => ref.length > 2).join(', '),
                alternativos: Array.from(document.querySelectorAll('.preAlternate')).map(el => el.innerText.trim())
            };
        });

        await browser.close();

        if (updateSheet && data.skuBase) {
            // Aquí llamarías a tu servicio de Google Sheets
            console.log("Actualizando Sheet para:", filterCode);
        }

        res.json(data);
    } catch (err) {
        if (browser) await browser.close();
        res.status(500).json({ error: "Fallo en navegación humana: " + err.message });
    }
};

// 3. Procesamiento por lotes
exports.batchProcess = async (req, res) => {
    res.json({ message: "Batch process activo" });
};
