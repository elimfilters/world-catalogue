// ============================================================================
// DESCRIPTION GENERATOR - German Quality ELIMFILTERS
// Generates professional product descriptions
// ============================================================================

/**
 * Generate professional product description
 * @param {string} family - OIL, FUEL, AIR, CABIN, COOLANT, HYDRAULIC, AIR_DRYER, MARINE
 * @param {string} duty - HD or LD
 * @param {string} subtype - Filter subtype (spin-on, cartridge, panel, etc)
 * @param {string} media - ELIMFILTERS media technology
 * @returns {string} - Professional description
 */
function generateDescription(family, duty, subtype, media) {
    const filterType = getFilterType(family, subtype);
    const technology = getTechnologyDescription(media);
    const equipment = getEquipmentList(family, duty);
    const industries = getIndustries(family, duty);
    
    return `${filterType} German Quality ELIMFILTERS ${technology}. ${equipment}. Aplicación principal en ${industries}.`;
}

/**
 * Get filter type description
 */
function getFilterType(family, subtype) {
    const types = {
        'OIL': {
            'spin-on': 'Filtro de aceite spin-on',
            'cartridge': 'Filtro de aceite tipo cartucho',
            'element': 'Elemento filtrante de aceite',
            'default': 'Filtro de aceite'
        },
        'FUEL': {
            'separator': 'Filtro separador de combustible diésel',
            'inline': 'Filtro de combustible diésel inline',
            'cartridge': 'Filtro de combustible tipo cartucho',
            'spin-on': 'Filtro de combustible spin-on',
            'default': 'Filtro de combustible'
        },
        'AIR': {
            'panel': 'Filtro de aire motor panel rectangular',
            'radial': 'Filtro de aire motor tipo radial',
            'cylindrical': 'Filtro de aire motor cilíndrico',
            'safety': 'Elemento de seguridad de aire motor',
            'default': 'Filtro de aire motor'
        },
        'CABIN': {
            'carbon': 'Filtro de aire de cabina con carbón activado',
            'electrostatic': 'Filtro de aire de cabina electrostático',
            'default': 'Filtro de aire de cabina'
        },
        'COOLANT': {
            'spin-on': 'Filtro de refrigerante spin-on',
            'cartridge': 'Filtro de refrigerante tipo cartucho',
            'default': 'Filtro de refrigerante'
        },
        'HYDRAULIC': {
            'spin-on': 'Filtro hidráulico de alta presión spin-on',
            'cartridge': 'Filtro hidráulico tipo cartucho',
            'inline': 'Filtro hidráulico inline',
            'default': 'Filtro hidráulico de alta presión'
        },
        'AIR_DRYER': {
            'cartridge': 'Cartucho secador de aire comprimido',
            'spin-on': 'Filtro secador de aire spin-on',
            'default': 'Filtro secador de aire (air dryer)'
        },
        'MARINE': {
            'fuel': 'Filtro de combustible marino',
            'oil': 'Filtro de aceite marino',
            'separator': 'Filtro separador agua/combustible marino',
            'default': 'Filtro marino Heavy Duty'
        }
    };
    
    const familyTypes = types[family] || types['OIL'];
    return familyTypes[subtype] || familyTypes['default'];
}

/**
 * Get technology description
 */
function getTechnologyDescription(media) {
    const descriptions = {
        'ELIMTEK™ ADVANCED': 'desarrollado con tecnología ELIMTEK™ ADVANCED de celulosa blend reforzada',
        'ELIMTEK™ SYNTHETIC': 'desarrollado con tecnología ELIMTEK™ SYNTHETIC de alto rendimiento',
        'ELIMTEK™ ULTRA': 'con tecnología SpectraFilt™ de separación agua/combustible >95%',
        'MACROCORE™ PRECISION': 'con tecnología DuraCore™ de celulosa plisada optimizada',
        'MACROCORE™ INDUSTRIAL': 'con tecnología OptiFlow™ de nano-fibra sintética electrospun',
        'MICROKAPPA™ PURE': 'con tecnología electrostática multi-capa de alta eficiencia',
        'MICROKAPPA™ PREMIUM': 'con tecnología FiltroMax™ de 4 etapas con carbón activado'
    };
    
    return descriptions[media] || 'desarrollado con tecnología de ingeniería alemana certificada';
}

/**
 * Get equipment list based on family and duty
 */
function getEquipmentList(family, duty) {
    const equipment = {
        'OIL_HD': 'Diseñado para motores diésel Heavy Duty en camiones Freightliner Cascadia, Kenworth T680, Peterbilt 579, entre otros',
        'OIL_LD': 'Compatible con Ford F-150, Chevrolet Silverado 1500, Ram 1500, entre otros',
        'FUEL_HD': 'Diseñado para sistemas de inyección de alta presión en Caterpillar C15, Cummins ISX, Detroit DD15, entre otros',
        'FUEL_LD': 'Compatible con Ford F-250 Super Duty, Chevrolet Silverado 2500HD, Ram 2500, entre otros',
        'AIR_HD': 'Diseñado para equipamiento pesado como Caterpillar 320, Komatsu PC200, John Deere 644, entre otros',
        'AIR_LD': 'Compatible con Toyota Camry, Honda Accord, Nissan Altima, entre otros',
        'CABIN_LD': 'Compatible con la mayoría de vehículos de pasajeros y comerciales ligeros',
        'COOLANT_HD': 'Diseñado para sistemas de refrigeración en motores diésel de equipamiento pesado',
        'HYDRAULIC_HD': 'Diseñado para sistemas hidráulicos de alta presión en excavadoras, cargadores y grúas, entre otros',
        'AIR_DRYER_HD': 'Diseñado para sistemas de frenos neumáticos en camiones clase 7-8 y equipamiento pesado',
        'MARINE_HD': 'Diseñado para motores diésel marinos, generadores navales y equipamiento offshore'
    };
    
    const key = `${family}_${duty}`;
    return equipment[key] || 'Compatible con múltiples aplicaciones de equipamiento automotriz e industrial';
}

/**
 * Get industries based on family and duty
 */
function getIndustries(family, duty) {
    const industries = {
        'OIL_HD': 'transporte de carga, construcción y minería',
        'OIL_LD': 'transporte ligero, flotas comerciales y uso personal',
        'FUEL_HD': 'transporte pesado, generación de energía y equipamiento agrícola',
        'FUEL_LD': 'pick-ups comerciales, agricultura y construcción',
        'AIR_HD': 'construcción, minería, agricultura y forestal',
        'AIR_LD': 'vehículos de pasajeros, flotas de taxi y servicios de entrega',
        'CABIN_LD': 'vehículos de pasajeros, transporte ejecutivo y flotas comerciales',
        'COOLANT_HD': 'transporte pesado, construcción y equipamiento industrial',
        'HYDRAULIC_HD': 'construcción, minería, agricultura y manejo de materiales',
        'AIR_DRYER_HD': 'transporte pesado, construcción y equipamiento neumático',
        'MARINE_HD': 'transporte marítimo, generación naval y operaciones offshore'
    };
    
    const key = `${family}_${duty}`;
    return industries[key] || 'aplicaciones industriales y automotrices';
}

/**
 * Get subtype from filter code or attributes
 * @param {string} family - Filter family
 * @param {object} attributes - Filter attributes from scraper
 * @returns {string} - Filter subtype
 */
function detectSubtype(family, attributes = {}) {
    // Try to detect from attributes
    if (attributes.type) {
        const typeUpper = attributes.type.toUpperCase();
        
        // Oil subtypes
        if (family === 'OIL') {
            if (typeUpper.includes('SPIN') || typeUpper.includes('ROSCA')) return 'spin-on';
            if (typeUpper.includes('CARTRIDGE') || typeUpper.includes('CARTUCHO')) return 'cartridge';
            if (typeUpper.includes('ELEMENT')) return 'element';
        }
        
        // Fuel subtypes
        if (family === 'FUEL') {
            if (typeUpper.includes('SEPARATOR') || typeUpper.includes('SEPARADOR')) return 'separator';
            if (typeUpper.includes('INLINE') || typeUpper.includes('LINEA')) return 'inline';
            if (typeUpper.includes('CARTRIDGE') || typeUpper.includes('CARTUCHO')) return 'cartridge';
            if (typeUpper.includes('SPIN')) return 'spin-on';
        }
        
        // Air subtypes
        if (family === 'AIR') {
            if (typeUpper.includes('PANEL')) return 'panel';
            if (typeUpper.includes('RADIAL')) return 'radial';
            if (typeUpper.includes('SAFETY') || typeUpper.includes('SEGURIDAD')) return 'safety';
            if (typeUpper.includes('CYLINDRICAL') || typeUpper.includes('CILINDRICO')) return 'cylindrical';
        }
        
        // Cabin subtypes
        if (family === 'CABIN') {
            if (typeUpper.includes('CARBON') || typeUpper.includes('CARBONO')) return 'carbon';
            return 'electrostatic';
        }
    }
    
    // Default subtypes by family
    const defaults = {
        'OIL': 'spin-on',
        'FUEL': 'separator',
        'AIR': 'panel',
        'CABIN': 'electrostatic',
        'COOLANT': 'spin-on',
        'HYDRAULIC': 'spin-on',
        'AIR_DRYER': 'cartridge',
        'MARINE': 'separator'
    };
    
    return defaults[family] || 'spin-on';
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    generateDescription,
    detectSubtype
};
