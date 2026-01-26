const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function runDonaldsonFull(partNumber) {
    const browser = await puppeteer.launch({ 
        headless: "new", 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    try {
        console.log(`🛰️ Navegando a Donaldson para: ${partNumber}...`);
        await page.goto(`https://shop.donaldson.com/store/en-us/search?Ntt=${partNumber}`, { 
            waitUntil: 'networkidle2', timeout: 60000 
        });

        // Si hay una lista de resultados, hacemos clic en el primero
        const productLink = await page.$('.product-name a');
        if (productLink) {
            await Promise.all([page.waitForNavigation(), productLink.click()]);
        }

        const content = await page.content();
        const text = content.toUpperCase();

        // DETECCIÓN REAL DE CATEGORÍA
        let category = 'AIRE';
        if (text.includes('LUBE') || text.includes('OIL') || text.includes('ACEITE')) category = 'LUBE';
        else if (text.includes('FUEL') || text.includes('COMBUSTIBLE')) category = 'FUEL';
        else if (text.includes('HYDRAULIC') || text.includes('HIDRA')) category = 'HIDRAULICO';

        // EXTRAER CÓDIGO REAL (Por si es un cruce)
        const realCode = await page.evaluate(() => {
            const el = document.querySelector('.product-number, .primary-id');
            return el ? el.innerText.replace('Part No.', '').trim() : null;
        });

        // ALTERNATIVOS (Columna AK)
        const alternatives = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('.alternate-parts-table a'));
            return links.map(a => a.innerText.trim()).filter(t => t.length > 2).slice(0, 3);
        });

        return {
            partNumber: realCode || partNumber,
            category: category,
            alternativeProducts: alternatives.join(" | ")
        };
    } catch (e) {
        console.error(`❌ Error Scraper: ${e.message}`);
        return null;
    } finally {
        await browser.close();
    }
}
module.exports = { runDonaldsonFull };