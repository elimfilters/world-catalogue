const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

const MARCAS_OEM = ['VOLVO', 'CATERPILLAR', 'CAT', 'JOHN DEERE', 'MACK', 'CUMMINS', 'KOMATSU', 'SCANIA', 'FREIGHTLINER', 'KENWORTH', 'TEREX', 'BOBCAT', 'CASE', 'DOOSAN', 'HITACHI', 'HYUNDAI', 'IVECO', 'JCB', 'LIEBHERR', 'MAN', 'MERCEDES-BENZ', 'MTU', 'PERKINS', 'RENAULT', 'YANMAR'];

module.exports = async function donaldsonScraper(oemCode) {
    // Forzamos a Node.js a comportarse como un navegador en el apretón de manos TLS
    const agent = new https.Agent({
        ciphers: 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256',
        honorCipherOrder: true,
        minVersion: 'TLSv1.2'
    });

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/ *;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Referer': 'https://shop.donaldson.com/store/es-us/home',
        'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-user': '?1'
    };

    try {
        const instance = axios.create({ headers, httpsAgent: agent, timeout: 20000 });
        
        // Paso 1: Buscador
        const searchRes = await instance.get(`https://shop.donaldson.com/store/es-us/search?Ntt=${oemCode}`);
        const $search = cheerio.load(searchRes.data);
        
        const relativeUrl = $search('#product_url').val() || $search('.donaldson-part-details').first().attr('href');
        if (!relativeUrl) throw new Error('Bloqueo de IP persistente por parte de Donaldson');

        const baseUrl = `https://shop.donaldson.com${relativeUrl}`;

        // Paso 2: Datos
        const [mainRes, crossRes] = await Promise.all([
            instance.get(baseUrl),
            instance.get(`${baseUrl}/_crossReferenceTab`)
        ]);

        const $main = cheerio.load(mainRes.data);
        const $cross = cheerio.load(crossRes.data);

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
            descripcion: $main('.prodSubTitle').text().trim(),
            oem_references,
            cross_references,
            idReal: relativeUrl.split('/')[4],
            url: baseUrl
        };
    } catch (error) {
        return { error: true, message: error.message };
    }
};
