const puppeteer = require('puppeteer-core');

exports.classifyFilter = async (req, res) => {
    const { filterCode } = req.body;
    let browser;
    try {
        // Abrimos un navegador invisible
        browser = await puppeteer.launch();
        const page = await browser.newPage();
        
        // Navegamos como un humano
        await page.goto(`https://shop.donaldson.com/store/es-us/search?Ntt=${filterCode}`);
        
        // PAUSA HUMANA: Esperamos a que el Tab de competencia aparezca y cargue
        await page.waitForSelector('.search-results-tab', { timeout: 5000 });
        
        // Hacemos "clic" en la pestaña de competencia
        const tabs = await page.$$('.search-results-tab');
        if (tabs.length > 1) await tabs[1].click();

        // Extraemos el texto una vez que la página terminó de "pensar"
        const content = await page.content();
        const pMatch = content.match(/P\d{6,7}/i);
        const isSep = /SEPARADOR|SEPARATOR/i.test(content);

        const pNumber = pMatch ? pMatch[0].toUpperCase() : "NO_HALLADO";
        
        await browser.close();

        return res.json({
            SKU: pNumber !== "NO_HALLADO" ? (isSep ? "ES9" : "EF9") + pNumber.slice(-4) : "EL80000",
            referencia_donaldson: pNumber,
            especificacion: isSep ? "SEPARADOR DE AGUA" : "FILTRO DE COMBUSTIBLE"
        });
    } catch (e) {
        if (browser) await browser.close();
        res.status(500).json({ error: "Donaldson bloqueó el acceso humano" });
    }
};
