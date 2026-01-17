const axios = require('axios');
const BRIDGE = 'https://script.google.com/macros/s/AKfycbwaMY5or2MCdkJ41N2r-a3XRhDyItlcqbtmgM8Zx_C4gFBi46xINvuN-B_znhviF-5/exec'; 

module.exports = async function donaldsonScraper(oemCode) {
    try {
        // Extraer el código Donaldson (P + números)
        const match = oemCode.match(/P\d{6,7}/i);
        const search = match ? match[0].toUpperCase() : oemCode.trim();
        
        console.log(`🎯 [PUENTE V5] Consultando: ${search}`);
        const res = await axios.get(`${BRIDGE}?q=${search}`);
        
        if (res.data && res.data.title) {
            return {
                error: false,
                descripcion: res.data.title.toUpperCase(),
                idReal: search
            };
        }
        return { error: true, message: "No se halló título en el HTML" };
    } catch (e) {
        return { error: true, message: "Fallo en conexión con el puente" };
    }
};
