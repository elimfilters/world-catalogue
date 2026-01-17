const axios = require('axios');
const BRIDGE = 'https://script.google.com/macros/s/AKfycbwaMY5or2MCdkJ41N2r-a3XRhDyltIcqbtmgM8Zx_C4gFBi46xlNvuN-B_znhviF-5/exec'; 

module.exports = async function donaldsonScraper(oemCode) {
    try {
        const search = oemCode.trim().toUpperCase();
        // Forzamos la búsqueda para que el Bridge capture el tab de competencia
        const res = await axios.get(BRIDGE + '?q=' + search + '*');
        
        if (res.data && res.data.title && res.data.title !== "Sin resultados") {
            return {
                error: false,
                descripcion: res.data.title.toUpperCase(),
                idReal: res.data.partNumber || "" // Capturamos el P550851 aquí
            };
        }
        return { error: true, message: "No se halló el tab de competencia" };
    } catch (e) {
        return { error: true, message: e.message };
    }
};
