const axios = require('axios');
const googleSheetsService = require('../services/googleSheets.service');

exports.testFullExtraction = async (req, res) => {
    const { filterCode, updateSheet } = req.body;
    
    // Headers obligatorios para que Donaldson no nos bloquee
    const donaldsonHeaders = {
        'accept': 'application/json, text/javascript, */*; q=0.01',
        'x-requested-with': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'referer': 'https://shop.donaldson.com/store/es-us/home'
    };

    try {
        // 1. Buscador (Convertir OEM a P-Number)
        const searchUrl = `https://shop.donaldson.com/store/es-us/search/results?Ntt=${filterCode}&_requestContext=competitor`;
        const searchRes = await axios.get(searchUrl, { headers: donaldsonHeaders });
        
        const pMatch = JSON.stringify(searchRes.data).match(/P\d{6,7}/i);
        if (!pMatch) return res.status(404).json({ error: "No hallado en Donaldson", debug: "Búsqueda fallida" });
        const realP = pMatch[0].toUpperCase();

        // 2. El asalto a los 4 túneles (Usando tus URLs de Fetch)
        const [attrRes, crossRes, equipRes] = await Promise.all([
            axios.get(`https://shop.donaldson.com/store/rest/fetchProductAttrAndRecentlyViewed?id=20823&fpp=${realP}`, { headers: donaldsonHeaders }),
            axios.get(`https://shop.donaldson.com/store/rest/fetchCrossReferenceData?fpp=${realP}`, { headers: donaldsonHeaders }),
            axios.get(`https://shop.donaldson.com/store/rest/fetchproductequipmentlist?fpp=${realP}`, { headers: donaldsonHeaders })
        ]);

        // 3. Limpieza de nombres de fabricantes (Solo códigos)
        const crossRefs = (crossRes.data.crossReferenceResponse || [])
            .map(ref => ref.part_number.replace(/[a-zA-Z]+\s/g, '').trim())
            .filter(code => code.length > 2);

        const specs = attrRes.data.productAttributesResponse?.dynamicAttributes || {};
        
        const data = {
            skuBase: realP,
            description: attrRes.data.recentlyViewedProductResponse?.recentlyViewedProducts[0]?.description || "Sin descripción",
            specs: specs,
            crossRefs: crossRefs.join(', '),
            alternativos: (attrRes.data.recentlyViewedProductResponse?.recentlyViewedProducts || [])
                            .filter(p => p.basePartNumber !== realP)
                            .map(p => p.basePartNumber),
            equipos: (equipRes.data.equipmentResponse || []).map(e => `${e.make} ${e.model}`).slice(0, 15)
        };

        if (updateSheet) {
            await googleSheetsService.updateFilterRow(filterCode, data);
        }

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: "Error en asalto directo: " + err.message });
    }
};

exports.classifyFilter = async (req, res) => { res.json({ status: "OK" }); };
exports.batchProcess = async (req, res) => { res.json({ status: "OK" }); };
