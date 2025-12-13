// ============================================================================
// FAMILY NORMALIZER - Normaliza sinónimos de familia a nombres estándar
// ============================================================================

const { detectFamily } = require('./familyDetector');

/**
 * Normaliza el nombre de familia desde diferentes variantes
 * @param {string} input - Nombre de familia o código de filtro
 * @returns {string|null} - Familia normalizada
 */
function normalizeFamily(input) {
    if (!input) return null;
    
    const text = String(input).toUpperCase().trim();
    
    // Usar familyDetector para detectar la familia
    const detected = detectFamily(text, null);
    if (detected) return detected;
    
    // Sinónimos directos
    const synonyms = {
        'ACEITE': 'OIL',
        'LUBE': 'OIL',
        'LUBRICANTE': 'OIL',
        'COMBUSTIBLE': 'FUEL FILTER',
        'AIRE': 'AIR',
        'CABINA': 'CABIN',
        'HIDRAULICO': 'HYDRAULIC',
        'REFRIGERANTE': 'COOLANT',
        'MARINO': 'MARINE',
        'TURBINA': 'TURBINE'
    };
    
    for (const [key, value] of Object.entries(synonyms)) {
        if (text.includes(key)) return value;
    }
    
    return null;
}

module.exports = {
    normalizeFamily
};
