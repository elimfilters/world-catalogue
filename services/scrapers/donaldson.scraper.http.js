const axios = require('axios');

const GOOGLE_BRIDGE_URL = 'https://script.google.com/macros/s/AKfycbwaMY5or2MCdkJ41N2r-a3XRhDyItlcqbtmgM8Zx_C4gFBi46xINvuN-B_znhviF-5/exec'; 

module.exports = async function donaldsonScraper(oemCode) {
    try {
        console.log(`🎯 [BRIDGE V4] Consultando API para: ${oemCode}`);
        const res = await axios.get(`${GOOGLE_BRIDGE_URL}?q=${oemCode}`);
        
        // Log crítico para ver en el panel de Railway
        console.log("📦 RESPUESTA CRUDA DEL PUENTE:", JSON.stringify(res.data).substring(0, 500));

        // Verificamos si la respuesta tiene la estructura de sugerencias de Donaldson
        if (res.data && res.data.productSuggestions && res.data.productSuggestions.length > 0) {
            const product = res.data.productSuggestions[0];
            return {
                error: false,
                descripcion: product.title || "Filtro Donaldson",
                idReal: product.partNumber || oemCode,
                oem_references: [],
                cross_references: []
            };
        }

        return { error: true, message: "No se hallaron datos en el JSON", raw: res.data };
    } catch (e) {
        console.error("❌ ERROR EN SCRAPER:", e.message);
        return { error: true, message: e.message };
    }
};
