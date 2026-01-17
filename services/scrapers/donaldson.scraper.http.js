const axios = require('axios');
const cheerio = require('cheerio');

// Lista de marcas para clasificación automática
const MARCAS_OEM = ['VOLVO', 'CATERPILLAR', 'CAT', 'JOHN DEERE', 'MACK', 'CUMMINS', 'KOMATSU', 'SCANIA', 'FREIGHTLINER', 'KENWORTH', 'TEREX', 'BOBCAT', 'CASE', 'DOOSAN', 'HITACHI', 'HYUNDAI', 'IVECO', 'JCB', 'LIEBHERR', 'MAN', 'MERCEDES-BENZ', 'MTU', 'PERKINS', 'RENAULT', 'YANMAR'];

module.exports = async function donaldsonScraperHTTP(oemCode) {
    try {
        console.log(`🔍 [Paso 1] Buscando en Donaldson: ${oemCode}`);
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'es-US,es;q=0.9',
            'Referer': 'https://shop.donaldson.com/store/es-us/home'
        };

        // 1. REPLICAR TU BÚSQUEDA: https://shop.donaldson.com/store/es-us/search?Ntt=85106370
        const searchUrl = `https://shop.donaldson.com/store/es-us/search?Ntt=${oemCode}`;
        const searchRes = await axios.get(searchUrl, { headers });
        const $search = cheerio.load(searchRes.data);
        
        // Capturar el href del link del producto como tú lo haces
        const relativeUrl = $search('#product_url').val() || $search('.donaldson-part-details').first().attr('href');
        
        if (!relativeUrl) {
            console.log('❌ No se encontró el link del producto en los resultados.');
            return { error: true, message: 'Producto no encontrado' };
        }

        const baseUrl = `https://shop.donaldson.com${relativeUrl}`;
        console.log(`🔗 [Paso 2] Entrando a la página oficial: ${baseUrl}`);

        // 2. EXTRAER TODO (Simulando los botones de "Mostrar más" mediante sus endpoints)
        const [mainRes, crossRefRes, equipRes] = await Promise.allSettled([
            axios.get(baseUrl, { headers }),
            axios.get(`${baseUrl}/_crossReferenceTab`, { headers }),
            axios.get(`${baseUrl}/_equipmentTab`, { headers })
        ]);

        const $ = cheerio.load(mainRes.value.data);
        const descripcion = $('.prodSubTitle').text().trim() || $('.product-name').text().trim();

        // 3. CLASIFICACIÓN OEM vs CROSS
        const oem_references = [];
        const cross_references = [];
        
        if (crossRefRes.status === 'fulfilled') {
            const $cross = cheerio.load(crossRefRes.value.data);
            $cross('table tbody tr').each((i, row) => {
                const manufacturer = $cross(row).find('td').eq(0).text().trim().toUpperCase();
                const partNum = $cross(row).find('td').eq(1).text().trim();
                
                if (manufacturer && partNum) {
                    const item = { brand: manufacturer, part_number: partNum };
                    // Si la marca está en nuestra lista maestra, es OEM
                    if (MARCAS_OEM.some(oem => manufacturer.includes(oem))) {
                        oem_references.push(item);
                    } else {
                        cross_references.push(item);
                    }
                }
            });
        }

        // 4. ATRIBUTOS (ESPECIFICACIONES)
        const especificaciones = {};
        $('.prodSpecInfoDiv table tr').each((i, row) => {
            const k = $(row).find('td').eq(0).text().trim().replace(':', '');
            const v = $(row).find('td').eq(1).text().trim();
            if (k && v) especificaciones[k] = v;
        });

        return {
            error: false,
            skuBuscado: oemCode,
            idReal: relativeUrl.split('/')[4], // Ejemplo: P527682
            descripcion,
            especificaciones,
            oem_references,
            cross_references,
            productosEquipo: [], // Aquí iría la lógica de equipRes si la necesitas
            url: baseUrl,
            scrapedAt: new Date().toISOString()
        };

    } catch (error) {
        return { error: true, message: error.message };
    }
};
