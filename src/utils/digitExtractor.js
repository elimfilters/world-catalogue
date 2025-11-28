// /src/utils/digitExtractor.js

function extractLast4(oemCode) {
    if (!oemCode) return null;

    // 1. Normalizar
    let clean = oemCode.toString().toUpperCase().replace(/[^A-Z0-9]/g, "");

    // 2. Extraer dígitos
    let digits = clean.replace(/\D/g, "");
    if (!digits) return null;

    // 3. Tomar últimos 4
    let last4 = digits.slice(-4);

    // 4. Rellenar si faltan
    return last4.padStart(4, "0");
}

module.exports = { extractLast4 };
