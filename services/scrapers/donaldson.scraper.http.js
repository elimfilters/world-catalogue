const axios = require('axios');
const BRIDGE = 'https://script.google.com/macros/s/AKfycbwaMY5or2MCdkJ41N2r-a3XRhDyltIcqbtmgM8Zx_C4gFBi46xlNvuN-B_znhviF-5/exec'; 

module.exports = async function donaldsonScraper(oemCode) {
    try {
        const search = oemCode.trim().toUpperCase();
        
        // Intento 1: Búsqueda tal cual
        let res = await axios.get(BRIDGE + '?q=' + search);
        
        // Intento 2: Si falla, forzamos búsqueda con asterisco (como en la web oficial)
        if (!res.data || !res.data.title || res.data.title === "Sin resultados") {
            res = await axios.get(BRIDGE + '?q=' + search + '*');
        }
        
        if (res.data && res.data.title && res.data.title !== "Sin resultados") {
            return {
                error: false,
                descripcion: res.data.title.toUpperCase(),
                idReal: res.data.partNumber || search // Intentamos capturar el P-Number del bridge
            };
        }
        return { error: true, message: "Sin datos" };
    } catch (e) {
        return { error: true, message: e.message };
    }
};
