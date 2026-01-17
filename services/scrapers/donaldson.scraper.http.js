const axios = require('axios');
const cheerio = require('cheerio');

const MARCAS_OEM = ['VOLVO', 'CATERPILLAR', 'CAT', 'JOHN DEERE', 'MACK', 'CUMMINS', 'KOMATSU', 'SCANIA', 'FREIGHTLINER', 'KENWORTH', 'TEREX', 'BOBCAT', 'CASE', 'DOOSAN', 'HITACHI', 'HYUNDAI', 'IVECO', 'JCB', 'LIEBHERR', 'MAN', 'MERCEDES-BENZ', 'MTU', 'PERKINS', 'RENAULT', 'YANMAR'];

module.exports = async function donaldsonScraper(oemCode) {
    // Headers que imitan exactamente a un Chrome real en Windows
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9',
        'Referer': 'https://shop.donaldson.com/store/es-us/home',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
    };

    try {
        console.log(`🔎 [Paso 1] Buscando código: ${oemCode}`);
        const searchUrl = `https://shop.donaldson.com/store/es-us/search?Ntt=${oemCode}`;
        
        // Usamos una instancia de axios para mantener cookies básicas
        const instance = axios.create({ headers, timeout: 15000 });
        const searchRes = await instance.get(searchUrl);
        const $search = cheerio.load(searchRes.data);

        // Capturamos el link tal cual lo haces tú
        const relativeUrl = $search('#product_url').val() || $search('.donaldson-part-details').first().attr('href');
        
        if (!relativeUrl) {
            throw new Error('Donaldson no respondió con resultados legibles (Bloqueo de IP)');
        }

        const baseUrl = `https://shop.donaldson.com${relativeUrl}`;
        console.log(`🔗 [Paso 2] Entrando a link oficial: ${baseUrl}`);

        // Pedimos la página principal y la pestaña de referencias
        const [mainPage, crossRefs] = await Promise.all([
            instance.get(baseUrl),
            instance.get(`${baseUrl}/_crossReferenceTab`)
        ]);

        const $main = cheerio.load(mainPage.data);
        const $cross = cheerio.load(crossRefs.data);

        const oem_references = [];
        const cross_references = [];

        // Extraer y clasificar
        $cross('table tbody tr').each((i, row) => {
            const brand = $cross(row).find('td').eq(0).text().trim().toUpperCase();
            const part = $cross(row).find('td').eq(1).text().trim();
            if (brand && part) {
                const item = { brand, part_number: part };
                if (MARCAS_OEM.some(oem => brand.includes(oem))) {
                    oem_references.push(item);
                } else {
                    cross_references.push(item);
                }
            }
        });

        return {
            error: false,
            skuBuscado: oemCode,
            idReal: relativeUrl.split('/')[4],
            descripcion: $main('.prodSubTitle').text().trim() || $main('h1').text().trim(),
            oem_references,
            cross_references,
            url: baseUrl
        };

    } catch (error) {
        console.error('❌ Error Scraper:', error.message);
        return { error: true, message: error.message };
    }
};
