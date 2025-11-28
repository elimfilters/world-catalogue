// =======================================================
// familyDetector.js — A63-FIX
// =======================================================

// Normaliza texto de scraper
function clean(text) {
    return text ? text.toUpperCase().trim() : "";
}

// Detecta familia desde textos del scraper Donaldson / FRAM
function detectFamily(scraperFamily, scraperSubtype) {
    const f = clean(scraperFamily);
    const s = clean(scraperSubtype);

    // ------------------------------
    // OIL
    // ------------------------------
    if (f.includes("OIL") || f.includes("LUBE")) {
        return "OIL";
    }

    // ------------------------------
    // FUEL
    // ------------------------------
    if (f.includes("FUEL") && !f.includes("SEPARATOR")) {
        return "FUEL";
    }

    // Fuel Separator
    if (f.includes("SEPARATOR")) {
        return "FUEL SEPARATOR";
    }

    // ------------------------------
    // AIR / AIRE
    // ------------------------------
    if (f.includes("AIR") || f.includes("AIRE")) {
        // Housing detection
        if (f.includes("HOUSING")) return "CARCAZA AIR FILTER";
        return "AIRE";
    }

    // ------------------------------
    // CABIN
    // ------------------------------
    if (f.includes("CABIN") || f.includes("INTERIOR")) {
        return "CABIN";
    }

    // ------------------------------
    // HYDRAULIC
    // ------------------------------
    if (f.includes("HYDRAULIC") || f.includes("HYD")) {
        return "HIDRAULIC";
    }

    // ------------------------------
    // AIR DRYER
    // ------------------------------
    if (f.includes("DRYER")) {
        return "AIR DRYER";
    }

    // ------------------------------
    // COOLANT
    // ------------------------------
    if (f.includes("COOLANT")) {
        return "COOLANT";
    }

    // ------------------------------
    // TURBINE / MARINE
    // ------------------------------
    if (f.includes("TURBINE")) return "TURBINE SERIES";
    if (f.includes("MARINE")) return "MARINE FILTERS";

    return null; // No se pudo detectar familia
}

/**
 * Detect family for Heavy Duty filters
 * @param {string} familyHint - Family hint from scraper
 * @returns {string|null} - Detected family
 */
function detectFamilyHD(familyHint) {
    return detectFamily(familyHint, null);
}

/**
 * Detect family for Light Duty filters
 * @param {string} familyHint - Family hint from scraper
 * @returns {string|null} - Detected family
 */
function detectFamilyLD(familyHint) {
    return detectFamily(familyHint, null);
}

module.exports = {
    detectFamily,
    detectFamilyHD,
    detectFamilyLD
};
