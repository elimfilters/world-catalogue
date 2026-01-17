const axios = require('axios');
const cheerio = require('cheerio');

// Usando la URL de tu proyecto según la imagen f14714
const GOOGLE_BRIDGE_URL = 'https://script.google.com/macros/s/AKfycbwHA9qbji5FMuFY0gG6aaoJmW8e9mJxD4XI3JXZ9zA/exec'; 

const MARCAS_OEM = ['VOLVO', 'CATERPILLAR', 'CAT', 'JOHN DEERE', 'MACK', 'CUMMINS', 'KOMATSU', 'SCANIA', 'FREIGHTLINER', 'KENWORTH', 'TEREX', 'BOBCAT', 'CASE', 'DOOSAN', 'HITACHI', 'HYUNDAI', 'IVECO', 'JCB', 'LIEBHERR', 'MAN', 'MERCEDES-BENZ', 'MTU', 'PERKINS', 'RENAULT', 'YANMAR'];

module.exports = async function donaldsonScraper(oemCode) {
    try {
        console.log(`Bridge Activo -> Consultando: ${oemCode}`);
        const targetSearch = `https://shop.donaldson.com/store/es-us/search?Ntt=${oemCode}`;
        
        // Petición a través del Puente de Google
        const searchRes = await axios.get(`${GOOGLE_BRIDGE_URL}?url=${encodeURIComponent(targetSearch)}`);
        const $search = cheerio.load(searchRes.data);
        
        const relativeUrl = $search('#product_url').val() || $search('.donaldson-part-details').first().attr('href');

        if (!relativeUrl) {
            console.log("❌ No se halló link. Contenido recibido:", searchRes.data.substring(0, 100));
            return { error: true, message: 'No se encontró el producto en Donaldson' };
        }

        const baseUrl = `https://shop.donaldson.com${relativeUrl}`;

        // Obtener página principal y referencias cruzadas
        const [mainPage, crossRefs] = await Promise.all([
            axios.get(`${GOOGLE_BRIDGE_URL}?url=${encodeURIComponent(baseUrl)}`),
            axios.get(`${GOOGLE_BRIDGE_URL}?url=${encodeURIComponent(baseUrl + '/_crossReferenceTab')}`)
        ]);

        const $main = cheerio.load(mainPage.data);
        const $cross = cheerio.load(crossRefs.data);

        const oem_references = [];
        const cross_references = [];

        $cross('table tbody tr').each((i, row) => {
            const m = $cross(row).find('td').eq(0).text().trim().toUpperCase();
            const p = $cross(row).find('td').eq(1).text().trim();
            if (m && p) {
                const item = { brand: m, part_number: p };
                if (MARCAS_OEM.some(oem => m.includes(oem))) oem_references.push(item);
                else cross_references.push(item);
            }
        });

        return {
            error: false,
            skuBuscado: oemCode,
            descripcion: $main('.prodSubTitle').text().trim() || $main('h1').text().trim(),
            oem_references,
            cross_references,
            idReal: relativeUrl.split('/')[4],
            url: baseUrl
        };
    } catch (error) {
        return { error: true, message: "Error en el Puente: " + error.message };
    }
};
