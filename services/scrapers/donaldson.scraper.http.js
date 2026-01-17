const { gotScraping } = require('got-scraping');
const cheerio = require('cheerio');

const MARCAS_OEM = ['VOLVO', 'CATERPILLAR', 'CAT', 'JOHN DEERE', 'MACK', 'CUMMINS', 'KOMATSU', 'SCANIA', 'FREIGHTLINER', 'KENWORTH', 'TEREX', 'BOBCAT', 'CASE', 'DOOSAN', 'HITACHI', 'HYUNDAI', 'IVECO', 'JCB', 'LIEBHERR', 'MAN', 'MERCEDES-BENZ', 'MTU', 'PERKINS', 'RENAULT', 'YANMAR'];

module.exports = async function donaldsonScraper(oemCode) {
    try {
        console.log(`🔍 Intentando bypass para: ${oemCode}`);
        
        // 1. BÚSQUEDA (Imitando huella digital de Chrome real)
        const searchUrl = `https://shop.donaldson.com/store/es-us/search?Ntt=${oemCode}`;
        const response = await gotScraping.get(searchUrl);
        const $search = cheerio.load(response.body);

        const relativeUrl = $search('#product_url').val() || $search('.donaldson-part-details').first().attr('href');
        if (!relativeUrl) throw new Error('No se encontró el producto (Bloqueo de IP)');

        const baseUrl = `https://shop.donaldson.com${relativeUrl}`;

        // 2. PEDIR LOS FRAGMENTOS (Donde están el "+" y el "Mostrar más")
        const [mainRes, crossRes] = await Promise.all([
            gotScraping.get(baseUrl),
            gotScraping.get(`${baseUrl}/_crossReferenceTab`)
        ]);

        const $main = cheerio.load(mainRes.body);
        const $cross = cheerio.load(crossRes.body);

        const oem_references = [];
        const cross_references = [];

        $cross('table tbody tr').each((i, row) => {
            const brand = $cross(row).find('td').eq(0).text().trim().toUpperCase();
            const part = $cross(row).find('td').eq(1).text().trim();
            if (brand && part) {
                const item = { brand, part_number: part };
                if (MARCAS_OEM.some(m => brand.includes(m))) oem_references.push(item);
                else cross_references.push(item);
            }
        });

        return {
            error: false,
            skuBuscado: oemCode,
            descripcion: $main('.prodSubTitle').text().trim(),
            oem_references,
            cross_references,
            url: baseUrl
        };
    } catch (error) {
        console.error('❌ Error fatal:', error.message);
        return { error: true, message: error.message };
    }
};
