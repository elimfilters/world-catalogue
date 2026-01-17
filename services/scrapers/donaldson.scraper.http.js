const axios = require('axios');
// URL verificada desde tu captura Versión 7
const BRIDGE = 'https://script.google.com/macros/s/AKfycbwaMY5or2MCdkJ41N2r-a3XRhDyltIcqbtmgM8Zx_C4gFBi46xlNvuN-B_znhviF-5/exec'; 

module.exports = async function donaldsonScraper(oemCode) {
    try {
        const match = oemCode.match(/P\d{6,7}/i);
        const search = match ? match[0].toUpperCase() : oemCode.trim();
        
        console.log('📡 Consultando Puente V7:', search);
        const res = await axios.get(\\?q=\\);
        
        if (res.data && res.data.title) {
            return {
                error: false,
                descripcion: res.data.title.toUpperCase(),
                idReal: search
            };
        }
        return { error: true, message: "Respuesta sin título" };
    } catch (e) {
        return { error: true, message: "Error de red: " + e.message };
    }
};
