const axios = require('axios');
// URL Corregida según tu captura de pantalla (Versión 5)
const BRIDGE = 'https://script.google.com/macros/s/AKfycbwaMY5or2MCdkJ41N2r-a3XRhDyltIcqbtmgM8Zx_C4gFBi46xlNvuN-B_znhviF-5/exec'; 

module.exports = async function donaldsonScraper(oemCode) {
    try {
        const match = oemCode.match(/P\d{6,7}/i);
        const search = match ? match[0].toUpperCase() : oemCode.trim();
        
        console.log(`📡 Consultando Puente V5 para: ${search}`);
        const res = await axios.get(`${BRIDGE}?q=${search}`);
        
        if (res.data && res.data.title) {
            return {
                error: false,
                descripcion: res.data.title.toUpperCase(),
                idReal: search
            };
        }
        return { error: true, message: "Respuesta vacía del puente" };
    } catch (e) {
        return { error: true, message: "Error de conexión: " + e.message };
    }
};
