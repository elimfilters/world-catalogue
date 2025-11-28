// /src/utils/familyDetector.js

function detectFamilyFromScraper(type = "") {
    type = type.toUpperCase();

    if (type.includes("OIL")) return "OIL";
    if (type.includes("FUEL") && type.includes("SEPARATOR")) return "FUEL SEPARATOR";
    if (type.includes("FUEL")) return "FUEL";
    if (type.includes("AIR") && type.includes("DRYER")) return "AIR DRYER";
    if (type.includes("AIR")) return "AIRE";
    if (type.includes("CABIN") || type.includes("CAB")) return "CABIN";
    if (type.includes("HYD")) return "HIDRAULIC";
    if (type.includes("COOL")) return "COOLANT";
    if (type.includes("MARINE")) return "MARINE";

    return null;
}

module.exports = { detectFamilyFromScraper };
