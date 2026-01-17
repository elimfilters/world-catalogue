const axios = require('axios');

const GOOGLE_BRIDGE_URL = 'https://script.google.com/macros/s/AKfycbwaMY5or2MCdkJ41N2r-a3XRhDyItlcqbtmgM8Zx_C4gFBi46xINvuN-B_znhviF-5/exec'; 

module.exports = async function donaldsonScraper(oemCode) {
    try {
        // LIMPIEZA: Si el código trae basura antes de la P (ej: 2191P527682)
        const cleanMatch = oemCode.match(/P\d{6,7}/i);
        const searchCode = cleanMatch ? cleanMatch[0] : oemCode;
        
        console.log(`🎯 [BRIDGE V5] Buscando código limpio: ${searchCode}`);
        const res = await axios.get(`${GOOGLE_BRIDGE_URL}?q=${searchCode}`);
        
        if (res.data && res.data.productSuggestions && res.data.productSuggestions.length > 0) {
            const product = res.data.productSuggestions[0];
            return {
                error: false,
                descripcion: product.title || "FILTRO DE AIRE",
                idReal: product.partNumber || searchCode,
                oem_references: [],
                cross_references: []
            };
        }

        return { error: true, message: "No se hallaron datos en Donaldson" };
    } catch (e) {
        return { error: true, message: e.message };
    }
};
