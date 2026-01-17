const axios = require('axios');
const cheerio = require('cheerio');

// PEGA AQUÍ TU URL DE GOOGLE (la que termina en /exec)
const GOOGLE_BRIDGE_URL = 'https://script.google.com/macros/s/AKfycbwaMY5or2MCdkJ41N2r-a3XRhDyItlcqbtmgM8Zx_C4gFBi46xINvuN-B_znhviF-5/exec'; 

const MARCAS_OEM = ['VOLVO', 'CATERPILLAR', 'CAT', 'JOHN DEERE', 'MACK', 'CUMMINS', 'KOMATSU', 'SCANIA', 'FREIGHTLINER', 'KENWORTH', 'TEREX', 'BOBCAT', 'CASE', 'DOOSAN', 'HITACHI', 'HYUNDAI', 'IVECO', 'JCB', 'LIEBHERR', 'MAN', 'MERCEDES-BENZ', 'MTU', 'PERKINS', 'RENAULT', 'YANMAR'];

module.exports = async function donaldsonScraper(oemCode) {
    try {
        console.log(`🌉 [Puente Google] Saltando bloqueo para: ${oemCode}`);
        
        // 1. Buscamos el producto vía Google Bridge
        const targetSearch = `https://shop.donaldson.com/store/es-us/search?Ntt=${oemCode}`;
        const searchRes = await axios.get(`${GOOGLE_BRIDGE_URL}?url=${encodeURIComponent(targetSearch)}`);
        const $search = cheerio.load(searchRes.data);
        
        const relativeUrl = $search('#product_url').val() || $search('.donaldson-part-details').first().attr('href');
        
        if (!relativeUrl) {
            console.log('❌ No se encontró link del producto. Donaldson podría estar bloqueando el Bridge o el código no existe.');
            return { error: true, message: 'Producto no encontrado' };
        }

        const baseUrl = `https://shop.donaldson.com${relativeUrl}`;

        // 2. Extraemos descripción y referencias en paralelo usando el puente
        const [mainPage, crossRefs] = await Promise.all([
            axios.get(`${GOOGLE_BRIDGE_URL}?url=${encodeURIComponent(baseUrl)}`),
            axios.get(`${GOOGLE_BRIDGE_URL}?url=${encodeURIComponent(baseUrl + '/_crossReferenceTab')}`)
        ]);

        const $main = cheerio.load(mainPage.data);
        const $cross = cheerio.load(crossRefs.data);

        const oem_references = [];
        const cross_references = [];

        // Extraer referencias cruzadas y clasificar
        $cross('table tbody tr').each((i, row) => {
            const m = $cross(row).find('td').eq(0).text().trim().toUpperCase();
            const p = $cross(row).find('td').eq(1).text().trim();
            if (m && p) {
                const item = { brand: m, part_number: p };
                if (MARCAS_OEM.some(oem => m.includes(oem))) {
                    oem_references.push(item);
                } else {
                    cross_references.push(item);
                }
            }
        });

        const descripcion = $main('.prodSubTitle').text().trim() || $main('h1').text().trim();

        return {
            error: false,
            skuBuscado: oemCode,
            idReal: relativeUrl.split('/')[4],
            descripcion,
            oem_references,
            cross_references,
            url: baseUrl,
            scrapedAt: new Date().toISOString()
        };
    } catch (error) {
        console.error('❌ Error en el Puente:', error.message);
        return { error: true, message: "Error Puente Google: " + error.message };
    }
};
