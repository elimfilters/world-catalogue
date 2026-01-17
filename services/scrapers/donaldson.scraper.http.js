const axios = require('axios');
const cheerio = require('cheerio');

const MARCAS_OEM = ['VOLVO', 'CATERPILLAR', 'CAT', 'JOHN DEERE', 'MACK', 'CUMMINS', 'KOMATSU', 'SCANIA', 'FREIGHTLINER', 'KENWORTH', 'TEREX', 'BOBCAT', 'CASE', 'DOOSAN', 'HITACHI', 'HYUNDAI', 'IVECO', 'JCB', 'LIEBHERR', 'MAN', 'MERCEDES-BENZ', 'MTU', 'PERKINS', 'RENAULT', 'YANMAR'];

module.exports = async function donaldsonScraperHTTP(oemCode) {
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'no-cache'
    };

    try {
        // PASO 1: BÚSQUEDA CON SEGUIMIENTO DE COOKIES
        const searchUrl = `https://shop.donaldson.com/store/es-us/search?Ntt=${oemCode}`;
        const session = axios.create({ headers, withCredentials: true });
        
        const searchRes = await session.get(searchUrl);
        const $search = cheerio.load(searchRes.data);
        
        // Intentar obtener el ID de producto y la URL
        const relativeUrl = $search('#product_url').val() || $search('.donaldson-part-details').first().attr('href');
        
        if (!relativeUrl) {
            // Si falla el primer selector, buscamos en los datos de la lista
            const linkAlternativo = $search('a[href*="/product/"]').first().attr('href');
            if (!linkAlternativo) throw new Error('Bloqueo de seguridad detectado por Donaldson');
            var fullUrl = `https://shop.donaldson.com${linkAlternativo}`;
        } else {
            var fullUrl = `https://shop.donaldson.com${relativeUrl}`;
        }

        // PASO 2: EXTRAER DATOS DE LAS TABS (Pidiendo el HTML completo)
        const [mainPage, crossRefs] = await Promise.all([
            session.get(fullUrl),
            session.get(`${fullUrl}/_crossReferenceTab`)
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
                MARCAS_OEM.some(oem => m.includes(oem)) ? oem_references.push(item) : cross_references.push(item);
            }
        });

        return {
            error: false,
            skuBuscado: oemCode,
            idReal: fullUrl.split('/')[6] || 'N/A',
            descripcion: $main('.prodSubTitle').text().trim() || $main('h1').text().trim(),
            especificaciones: {}, 
            oem_references,
            cross_references,
            productosAlternativos: [...oem_references, ...cross_references],
            url: fullUrl
        };
    } catch (error) {
        console.error('ERROR DETALLADO:', error.message);
        return { error: true, message: "Donaldson bloqueó la conexión. Reintentando..." };
    }
};
