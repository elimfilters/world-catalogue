const axios = require('axios');

const GOOGLE_BRIDGE_URL = 'https://script.google.com/macros/s/AKfycbwaMY5or2MCdkJ41N2r-a3XRhDyItlcqbtmgM8Zx_C4gFBi46xINvuN-B_znhviF-5/exec'; 

module.exports = async function donaldsonScraper(oemCode) {
    try {
        console.log(`📡 Investigando respuesta para: ${oemCode}`);
        const res = await axios.get(`${GOOGLE_BRIDGE_URL}?q=${oemCode}`);
        
        // Si el puente devuelve un error de Google (HTML en lugar de JSON)
        if (typeof res.data === 'string' && res.data.includes("<!DOCTYPE html>")) {
             return { error: true, message: "El puente devolvió HTML (posible error de script en Google)", raw: res.data.substring(0, 100) };
        }

        // RETORNAMOS TODO LO QUE LLEGUE PARA VERLO EN CONSOLA
        return {
            error: false,
            descripcion: "MODO_DIAGNOSTICO",
            skuBuscado: oemCode,
            rawData: res.data // Aquí veremos la estructura real
        };
    } catch (e) {
        return { error: true, message: "Error de conexión: " + e.message };
    }
};
