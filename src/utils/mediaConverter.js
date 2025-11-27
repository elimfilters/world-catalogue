// =====================================================
// CONVERSIÓN DE MEDIOS A ELIMFILTERS (A56–A59 FINAL)
// =====================================================

function convertToElimMedia(family) {
    if (!family) return "ELIMTEK™ STANDARD 90%";

    const f = family.toUpperCase();

    if (f.includes("AIR")) return "MACROCORE™";
    if (f.includes("CABIN")) return "MICROKAPPA™";

    // OIL / FUEL / HYD / COOLANT → 3 niveles
    return {
        EXTENDED: "ELIMTEK™ EXTENDED 99%",
        PRO: "ELIMTEK™ PRO 95%",
        STANDARD: "ELIMTEK™ STANDARD 90%"
    };
}

module.exports = { convertToElimMedia };
