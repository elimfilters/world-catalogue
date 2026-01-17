const puppeteer = require('puppeteer');

const MARCAS_OEM = ['VOLVO', 'CATERPILLAR', 'CAT', 'JOHN DEERE', 'MACK', 'CUMMINS', 'KOMATSU', 'SCANIA', 'FREIGHTLINER', 'KENWORTH', 'TEREX', 'BOBCAT', 'CASE', 'DOOSAN', 'HITACHI', 'HYUNDAI', 'IVECO', 'JCB', 'LIEBHERR', 'MAN', 'MERCEDES-BENZ', 'MTU', 'PERKINS', 'RENAULT', 'YANMAR'];

module.exports = async function donaldsonScraper(oemCode) {
    let browser;
    try {
        console.log(`🚀 [Puppeteer] Iniciando búsqueda real para: ${oemCode}`);
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // 1. IR AL BUSCADOR (TU PASO 1)
        await page.goto(`https://shop.donaldson.com/store/es-us/search?Ntt=${oemCode}`, { waitUntil: 'networkidle2' });

        // Capturar el link del primer resultado
        const productLink = await page.evaluate(() => {
            const link = document.querySelector('#product_url')?.value || document.querySelector('.donaldson-part-details')?.href;
            return link;
        });

        if (!productLink) throw new Error('Producto no encontrado');

        const finalUrl = productLink.startsWith('http') ? productLink : `https://shop.donaldson.com${productLink}`;
        console.log(`🔗 Entrando a: ${finalUrl}`);

        // 2. IR A LA PÁGINA DEL PRODUCTO
        await page.goto(finalUrl, { waitUntil: 'networkidle2' });

        // 3. PULSAR TABS Y "MOSTRAR MÁS" (TU PASO 2 Y 3)
        // Intentamos pulsar los botones si existen para forzar la carga
        await page.evaluate(async () => {
            const btnSpecs = document.querySelector('#showMoreProductSpecsButton');
            if (btnSpecs) btnSpecs.click();
            
            const btnCross = document.querySelector('#showAllCrossReferenceListButton');
            if (btnCross) btnCross.click();
            
            // Expandir los símbolos "+" de las referencias
            document.querySelectorAll('.fa-plus').forEach(el => el.click());
        });

        // Esperar un segundo a que cargue la expansión
        await new Promise(r => setTimeout(r, 1500));

        // 4. EXTRAER TODA LA DATA CLASIFICADA
        const data = await page.evaluate((marcasOem) => {
            const desc = document.querySelector('.prodSubTitle')?.innerText || document.querySelector('h1')?.innerText;
            
            const oem_refs = [];
            const cross_refs = [];
            
            document.querySelectorAll('.crossRefDiv table tbody tr').each((i, row) => {
                const brand = row.cells[0]?.innerText.trim().toUpperCase();
                const part = row.cells[1]?.innerText.trim();
                if (brand && part) {
                    const isOem = marcasOem.some(m => brand.includes(m));
                    if (isOem) oem_refs.push({ brand, part_number: part });
                    else cross_refs.push({ brand, part_number: part });
                }
            });

            return { desc, oem_refs, cross_refs };
        }, MARCAS_OEM);

        await browser.close();

        return {
            error: false,
            skuBuscado: oemCode,
            descripcion: data.desc,
            oem_references: data.oem_refs,
            cross_references: data.cross_refs,
            url: finalUrl
        };

    } catch (error) {
        if (browser) await browser.close();
        return { error: true, message: error.message };
    }
};
