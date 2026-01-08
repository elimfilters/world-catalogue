const puppeteer = require('puppeteer');

async function getDonaldsonAlternatives(url) {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    try {
        // Esperar el tab de productos alternativos
        await page.waitForSelector('button[aria-controls*="crossReference"]', { timeout: 10000 });
        await page.click('button[aria-controls*="crossReference"]');

        // Esperar que se cargue el contenido alternativo
        await page.waitForSelector('.cross-reference-results .cross-reference-row', { timeout: 10000 });

        // Extraer productos alternativos
        const alternativos = await page.$$eval('.cross-reference-results .cross-reference-row', rows => {
            return rows.map(row => {
                const codigo = row.querySelector('.cross-reference-number')?.textContent?.trim();
                const descripcion = row.querySelector('.cross-reference-description')?.textContent?.trim();
                const enlace = row.querySelector('a')?.href;

                return {
                    codigo,
                    descripcion,
                    url: enlace
                };
            });
        });

        await browser.close();
        return alternativos.filter(a => a.codigo);

    } catch (err) {
        console.error("❌ No se pudieron obtener productos alternativos:", err.message);
        await browser.close();
        return [];
    }
}

module.exports = getDonaldsonAlternatives;
