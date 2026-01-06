const TECHNOLOGY_HOMOLOGATION_MAP = {
    'LUBE_OIL': { pref: 'EL8', tech: 'SYNTRAX™', iso: 'ISO 4548-12', desc: 'diseñado para capturar contaminantes microscópicos y garantizar una protección hidrodinámica superior.' },
    'AIR_SYSTEM': { pref: 'EA1', tech: 'NANOFORCE™', iso: 'ISO 5011', desc: 'fabricado para entornos de alta saturación de polvo, asegurando aire ultra-puro para el turbocompresor.' },
    'FUEL_SYSTEM': { pref: 'EF9', tech: 'SYNTEPORE™', iso: 'ISO 19438', desc: 'protege los sistemas de inyección contra el desgaste prematuro con eficiencia excepcional.' },
    'FUEL_SEPARATOR': { pref: 'ES9', tech: 'AQUAGUARD®', iso: 'ISO 4020', desc: 'logra una remoción de agua del 99.5%, previniendo la corrosión en los inyectores.' },
    'AIR_DRYER': { pref: 'ED4', tech: 'DRYTECH™', iso: 'ISO 12500', desc: 'garantiza aire seco y libre de contaminantes para una operación segura en equipo pesado.' },
    'MARINE_FILTER': { pref: 'EM9', tech: 'MARINEGUARD™', iso: 'ISO 10088', desc: 'resistencia superior a la corrosión salina para proteger motores en entornos hostiles.' }
};

const KIT_TECHNOLOGY = {
    tech: 'ARMOR-SYNC™',
    desc: 'es una solución de ingeniería integral. Cada componente ha sido sincronizado para ofrecer un blindaje total y máxima integridad operativa.'
};

const getEnrichedData = (sku) => {
    if (!sku) return null;
    const s = sku.toString().toUpperCase();
    if (s.startsWith('EK')) {
        return { tech: KIT_TECHNOLOGY.tech, full_description: 'El Kit Elimfilters® ' + s + ' bajo la arquitectura ' + KIT_TECHNOLOGY.tech + ' ' + KIT_TECHNOLOGY.desc };
    }
    const category = Object.values(TECHNOLOGY_HOMOLOGATION_MAP).find(t => s.startsWith(t.pref));
    if (category) {
        return { tech: category.tech, compliance: category.iso, full_description: 'El elemento Elimfilters® ' + s + ' con tecnología ' + category.tech + ' está ' + category.desc + ' Cumple con ' + category.iso };
    }
    return { tech: 'ELIMFILTERS™', full_description: 'Filtro de alto rendimiento Elimfilters® ' + s + ' diseñado para servicio pesado.' };
};

module.exports = { TECHNOLOGY_HOMOLOGATION_MAP, getEnrichedData };
