const axios = require('axios');
const googleSheetsService = require('../services/googleSheets.service');

exports.testFullExtraction = async (req, res) => {
    const { filterCode, updateSheet } = req.body;
    try {
        // 1. EL BUSCADOR (Lo que pones en la barra)
        const searchUrl = `https://shop.donaldson.com/store/es-us/search/results?Ntt=${filterCode}&_requestContext=competitor`;
        const searchRes = await axios.get(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        
        const pNumber = JSON.stringify(searchRes.data).match(/P\d{6,7}/i);
        if (!pNumber) return res.status(404).json({ error: "No hallado en Donaldson" });
        const realP = pNumber[0].toUpperCase();

        // 2. ASALTO A LOS 4 TABS EN PARALELO (Los Fetch que me pasaste)
        const [attrRes, crossRes, equipRes] = await Promise.all([
            axios.get(`https://shop.donaldson.com/store/rest/fetchProductAttrAndRecentlyViewed?id=20823&fpp=${realP}`),
            axios.get(`https://shop.donaldson.com/store/rest/fetchCrossReferenceData?fpp=${realP}`),
            axios.get(`https://shop.donaldson.com/store/rest/fetchproductequipmentlist?fpp=${realP}`)
        ]);

        // 3. PROCESAMIENTO Y LIMPIEZA (Solo códigos, sin nombres)
        const crossRefs = (crossRes.data.crossReferenceResponse || [])
            .map(ref => ref.part_number.replace(/[a-zA-Z]+\s/g, '').trim())
            .filter(code => code.length > 2);

        const specs = attrRes.data.productAttributesResponse?.dynamicAttributes || {};
        const alternativos = (attrRes.data.recentlyViewedProductResponse?.recentlyViewedProducts || [])
            .filter(p => p.basePartNumber !== realP)
            .map(p => p.basePartNumber);

        const data = {
            skuBase: realP,
            description: attrRes.data.recentlyViewedProductResponse?.recentlyViewedProducts[0]?.description,
            specs: specs,
            crossRefs: crossRefs.join(', '),
            alternativos: alternativos,
            equipos: (equipRes.data.equipmentResponse || []).map(e => `${e.make} ${e.model}`).slice(0, 10)
        };

        if (updateSheet) {
            // Aquí se llenan las columnas M hasta la AL
            await googleSheetsService.updateFilterRow(filterCode, data);
        }

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: "Error en el asalto de 4 tabs: " + err.message });
    }
};

exports.classifyFilter = async (req, res) => { res.json({ status: "OK" }); };
exports.batchProcess = async (req, res) => { res.json({ status: "OK" }); };
