const puppeteer = require('puppeteer');

module.exports = async function donaldsonScraper(oemCode) {
    let browser;
    try {
        console.log('🔍 [Donaldson] Buscando:', oemCode);
        
        const digitsMatch = oemCode.match(/(\d{4,6})$/);
        if (!digitsMatch) {
            return { error: true, message: 'Código inválido', filterType: 'OIL', skuBuscado: oemCode, idReal: null };
        }
        
        const donaldsonCode = 'P55' + digitsMatch[1];
        const productUrl = `https://shop.donaldson.com/store/es-us/product/${donaldsonCode}/80`;
        
        browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.goto(productUrl, { waitUntil: 'networkidle2' });
        await page.waitForTimeout(3000);
        
        const descripcion = await page.$eval('.prodSubTitle', el => el.textContent.trim()).catch(() => '');
        console.log('📝 [Donaldson] Descripción:', descripcion);
        
        if (!descripcion) {
            await browser.close();
            return { error: true, message: 'No encontrado', filterType: 'OIL', skuBuscado: oemCode, idReal: null };
        }
        
        const textoBusqueda = descripcion.toLowerCase();
        let filterType = 'OIL';
        if (textoBusqueda.includes('lubricante') || textoBusqueda.includes('lube') || textoBusqueda.includes('oil')) filterType = 'OIL';
        else if (textoBusqueda.includes('combustible') || textoBusqueda.includes('fuel')) filterType = 'FUEL';
        else if (textoBusqueda.includes('aire') || textoBusqueda.includes('air')) filterType = 'AIR';
        
        console.log('🔍 [Donaldson] Extrayendo tabs...');
        
        // TAB: Atributos
        await page.click('a[data-target=".prodSpecInfoDiv"]').catch(() => {});
        await page.waitForTimeout(2000);
        const especificaciones = await page.evaluate(() => {
            const specs = {};
            document.querySelectorAll('.prodSpecInfoDiv .table-striped tr').forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 2) {
                    specs[cells[0].textContent.trim()] = cells[1].textContent.trim();
                }
            });
            return specs;
        });
        
        // TAB: Productos alternativos
        await page.click('a[data-target=".comapreProdListSection"]').catch(() => {});
        await page.waitForTimeout(2000);
        const productosAlternativos = await page.evaluate(() => {
            const productos = [];
            document.querySelectorAll('.compareListProdAlternate').forEach(item => {
                const codigo = item.querySelector('.preAlternate')?.textContent.trim();
                const descripcion = item.textContent;
                if (codigo) {
                    productos.push({
                        codigo: codigo,
                        esKit: descripcion.toLowerCase().includes('kit')
                    });
                }
            });
            return productos;
        });
        
        // TAB: Referencia cruzada
        await page.click('a[data-target=".ListCrossReferenceDetailPageComp"]').catch(() => {});
        await page.waitForTimeout(2000);
        const referencias = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.ListCrossReferenceDetailPageComp .cross-reference-code, .ListCrossReferenceDetailPageComp td'))
                .map(el => el.textContent.trim()).filter(t => t && /^[A-Z0-9\-]+$/.test(t));
        });
        
        // TAB: Productos del equipo
        await page.click('a[data-target=".ListPartDetailPageComp"]').catch(() => {});
        await page.waitForTimeout(2000);
        const productosEquipo = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.ListPartDetailPageComp .equipment-name, .ListPartDetailPageComp td'))
                .map(el => el.textContent.trim()).filter(Boolean);
        });
        
        await browser.close();
        console.log('✅ [Donaldson] Completo');
        
        return {
            filterType,
            skuBuscado: oemCode,
            idReal: donaldsonCode,
            descripcion,
            especificaciones,
            productosAlternativos,
            referenciasCruzadas: referencias,
            productosEquipo,
            urlFinal: productUrl
        };
        
    } catch (error) {
        if (browser) await browser.close();
        console.error("🔴 [Donaldson] ERROR:", error.message);
        return { error: true, message: error.message, filterType: 'OIL', skuBuscado: oemCode, idReal: null };
    }
};