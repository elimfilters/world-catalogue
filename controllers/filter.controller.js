const axios = require('axios');
const googleSheetsService = require('../services/googleSheets.service');

exports.testFullExtraction = async (req, res) => {
    const { filterCode, updateSheet } = req.body;
    const headers = {
        'accept': 'application/json, text/javascript, */*; q=0.01',
        'x-requested-with': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'referer': 'https://shop.donaldson.com/store/es-us/home'
    };

    try {
        // PASO 1: Buscar el código (LF3620) para obtener el "Full ID" (P552100-316-541)
        const searchRes = await axios.get(`https://shop.donaldson.com/store/es-us/search/results?Ntt=${filterCode}`, { headers });
        const fullIdMatch = JSON.stringify(searchRes.data).match(/P\d{6,7}-\d{3}-\d{3}/i);
        
        if (!fullIdMatch) return res.status(404).json({ error: "No se encontró el Full ID" });
        const fpp = fullIdMatch[0];

        // PASO 2: Disparar a los 4 Tabs simultáneamente (Tus Fetch)
        const [resTabs1y2, resTab3, resTab4] = await Promise.all([
            axios.get(`https://shop.donaldson.com/store/rest/fetchProductAttrAndRecentlyViewed?id=20823&fpp=${fpp}`, { headers }),
            axios.get(`https://shop.donaldson.com/store/rest/fetchCrossReferenceData?fpp=${fpp}`, { headers }),
            axios.get(`https://shop.donaldson.com/store/rest/fetchproductequipmentlist?fpp=${fpp}`, { headers })
        ]);

        // TAB 1 (Alternativos): Extraer códigos como P551016 y DBL3998
        const alternativos = (resTabs1y2.data.recentlyViewedProductResponse?.recentlyViewedProducts || [])
            .filter(p => !fpp.includes(p.basePartNumber))
            .map(p => p.basePartNumber);

        // TAB 2 (Atributos): Ficha técnica completa (ya viene expandida en el JSON)
        const atributos = resTabs1y2.data.productAttributesResponse?.dynamicAttributes || {};

        // TAB 3 (Referencia Cruzada): LIMPIEZA TOTAL (Sin nombres de fabricante)
        const crucesSucios = resTab3.data.crossReferenceResponse || [];
        const crucesLimpios = crucesSucios.map(ref => {
            // Quitamos marcas: buscamos la primera palabra en mayúsculas y la borramos
            return ref.part_number.replace(/^[A-Z]+\s+/, '').trim();
        }).filter(c => c.length > 2);

        // TAB 4 (Productos del Equipo): Motores y maquinaria
        const equipos = (resTab4.data.equipmentResponse || []).map(e => `${e.make} ${e.model}`);

        const result = {
            skuBase: fpp.split('-')[0],
            fullId: fpp,
            descripcion: resTabs1y2.data.recentlyViewedProductResponse?.recentlyViewedProducts[0]?.description,
            atributos: atributos,
            cruces: [...new Set(crucesLimpios)].join(', '),
            alternativos: alternativos,
            equipos: equipos.slice(0, 20)
        };

        if (updateSheet) {
            await googleSheetsService.updateFilterRow(filterCode, result);
        }

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: "Error en el jalón: " + err.message });
    }
};

exports.classifyFilter = async (req, res) => { res.json({ status: "OK" }); };
exports.batchProcess = async (req, res) => { res.json({ status: "OK" }); };
