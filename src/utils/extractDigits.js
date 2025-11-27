// ========================================================
// EXTRACTOR OFICIAL DE LOS ÚLTIMOS 4 DÍGITOS — A63-FIX
// ========================================================

function extract4(oem) {
    if (!oem) return null;

    let clean = oem.replace(/[^0-9]/g, ""); // SOLO dígitos

    if (!clean) return null;

    // Si tiene menos de 4 → completar con ceros
    if (clean.length < 4) {
        return clean.padStart(4, "0");
    }

    // Si tiene 4 exactos → perfecto
    if (clean.length === 4) {
        return clean;
    }

    // Más de 4 → últimos 4 reales
    return clean.slice(-4);
}

module.exports = { extract4 };
