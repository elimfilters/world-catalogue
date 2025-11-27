// ===============================================
// DETECTOR HD/LD UNIVERSAL (A63-FIX)
// ===============================================

function detectDuty(oem, brand = "") {
    const code = (oem || "").toUpperCase();

    // Donaldson, CAT, Cummins… → HD
    if (code.startsWith("P") && code.length >= 6) return "HD";
    if (["CAT", "CUM", "DET", "1R"].some(p => code.startsWith(p))) return "HD";

    // FRAM + automotriz → LD
    if (["PH", "CA", "CH", "CF"].some(p => code.startsWith(p))) return "LD";

    // fallback
    return "LD";
}

module.exports = { detectDuty };
