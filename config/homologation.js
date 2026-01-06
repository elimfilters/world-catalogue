const TECHNOLOGY_HOMOLOGATION_MAP = {
    "LUBE_OIL": { pref: "EL8", tech: "SYNTRAX™", iso: "ISO 4548-12", duty_pivots: { HD: "Donaldson Specs", LD: "Fram Specs" } },
    "AIR_SYSTEM": { pref: "EA1", tech: "NANOFORCE™", iso: "ISO 5011" },
    "FUEL_SYSTEM": { pref: "EF9", tech: "SYNTEPORE™", iso: "ISO 19438", duty_pivots: { HD: "Donaldson Specs", LD: "Fram Specs" } },
    "FUEL_SEPARATOR": { pref: "ES9", tech: "AQUAGUARD®", iso: "ISO 4020", duty_pivots: { HD: "Donaldson FS Series", LD: "Fram PS Series" }, water_removal: "99.5%" },
    "AIR_DRYER": { pref: "ED4", tech: "DRYTECH™", iso: "ISO 12500", primary_duty: "HD", applications: ["Air brake systems", "Pneumatic controls"] },
    "MARINE_FILTER": { pref: "EM9", tech: "MARINEGUARD™", iso: "ISO 10088", variants: ["P", "S", "T"], environment: "Saltwater resistant", duty_pivots: { HD: "Racor Marine", LD: "Sierra Marine" } },
    "TURBINE_FUEL": { pref: "ET9", tech: "AQUAGUARD®", iso: "ISO 16332", variants: ["P", "T", "S"] },
    "HYDRAULIC_SYS": { pref: "EH6", tech: "CINTEK™", iso: "ISO 16889" },
    "COOLANT_SYS": { pref: "EW7", tech: "THERM™", iso: "ASTM D6210" },
    "CABIN_SYS": { pref: "EC1", tech: "BIOGUARD™", iso: "ISO 11155" }
};

const getTechBySku = (sku) => {
    if (!sku) return null;
    const entry = Object.values(TECHNOLOGY_HOMOLOGATION_MAP).find(t => sku.startsWith(t.pref));
    return entry || null;
};

module.exports = { TECHNOLOGY_HOMOLOGATION_MAP, getTechBySku };
