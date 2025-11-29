// ============================================================================
// MEDIA MAPPER - GENUINO ELIMFILTERS
// Precisión Alemana CERTIFICADA
// 7 Product Lines + 4 Proprietary Technologies
// LEGALLY CLEAN - No third-party brand references
// ============================================================================

/**
 * Get ELIMFILTERS media type based on filter characteristics
 * @param {string} family - OIL, FUEL, AIR, CABIN, COOLANT, HYDRAULIC, AIR_DRYER, MARINE
 * @param {string} duty - HD or LD
 * @param {string} code - Filter code for series detection
 * @returns {string} - ELIMFILTERS product line
 */
function getMedia(family, duty, code = '') {
    const codeUpper = code.toUpperCase();
    
    // =========================================================================
    // OIL FILTERS
    // =========================================================================
    if (family === 'OIL') {
        if (duty === 'HD') {
            return 'ELIMTEK™ SYNTHETIC';
        } else {
            // LD Oil - Generic pattern detection
            if (codeUpper.startsWith('XG')) {
                return 'ELIMTEK™ SYNTHETIC';
            } else if (codeUpper.startsWith('TG') || codeUpper.startsWith('HM')) {
                return 'ELIMTEK™ ADVANCED';
            } else {
                return 'ELIMTEK™ ADVANCED';
            }
        }
    }
    
    // =========================================================================
    // FUEL FILTERS
    // =========================================================================
    if (family === 'FUEL') {
        if (duty === 'HD') {
            return 'ELIMTEK™ ULTRA';
        } else {
            if (codeUpper.startsWith('PS')) {
                return 'ELIMTEK™ ULTRA';
            } else {
                return 'ELIMTEK™ ADVANCED';
            }
        }
    }
    
    // =========================================================================
    // AIR FILTERS
    // =========================================================================
    if (family === 'AIR') {
        if (duty === 'HD') {
            return 'MACROCORE™ INDUSTRIAL';
        } else {
            return 'MACROCORE™ PRECISION';
        }
    }
    
    // =========================================================================
    // CABIN FILTERS
    // =========================================================================
    if (family === 'CABIN') {
        if (codeUpper.startsWith('CF')) {
            return 'MICROKAPPA™ PREMIUM';
        } else {
            return 'MICROKAPPA™ PURE';
        }
    }
    
    // =========================================================================
    // COOLANT FILTERS
    // =========================================================================
    if (family === 'COOLANT') {
        return 'ELIMTEK™ SYNTHETIC';
    }
    
    // =========================================================================
    // HYDRAULIC FILTERS
    // =========================================================================
    if (family === 'HYDRAULIC') {
        return 'ELIMTEK™ ULTRA';
    }
    
    // =========================================================================
    // AIR DRYER FILTERS
    // =========================================================================
    if (family === 'AIR_DRYER') {
        return 'ELIMTEK™ ULTRA';
    }
    
    // =========================================================================
    // MARINE FILTERS
    // =========================================================================
    if (family === 'MARINE') {
        return 'ELIMTEK™ ULTRA';
    }
    
    // =========================================================================
    // DEFAULT FALLBACK
    // =========================================================================
    if (duty === 'HD') {
        return 'ELIMTEK™ SYNTHETIC';
    } else {
        return 'ELIMTEK™ ADVANCED';
    }
}

/**
 * Get detailed media specifications
 * @param {string} media - ELIMFILTERS product line
 * @returns {object} - Detailed specs
 */
function getMediaSpecs(media) {
    const specs = {
        'ELIMTEK™ ADVANCED': {
            type: 'Celulosa blend reforzada',
            efficiency: '97% @ 25 micrones',
            capacity_grams: '10',
            life_km: '20000',
            life_hours: '500',
            applications: 'Aceite motor LD, combustible gasolina, alto kilometraje',
            technology: 'Celulosa blend con fibras sintéticas y aditivos anti-desgaste',
            certifications: 'ISO 9001, SAE J806'
        },
        'ELIMTEK™ SYNTHETIC': {
            type: 'Synthetic Blend de Precisión',
            efficiency: '99% @ 20 micrones',
            capacity_grams: '14',
            life_km: '30000',
            life_hours: '1000',
            applications: 'Aceites sintéticos LD/HD, refrigerante HD',
            technology: 'Synthetic Blend 50% nano-fibra / 50% celulosa tratada',
            certifications: 'ISO 9001, ISO/TS 16949, ISO 4548-12'
        },
        'ELIMTEK™ ULTRA': {
            type: 'SpectraFilt™ Multi-Capa',
            efficiency: '99.5% @ 4 micrones',
            capacity_grams: '45',
            life_km: '30000',
            life_hours: '1000',
            applications: 'Combustible diésel HD, separadores agua/combustible, hidráulico HD, air dryer HD, marinos',
            technology: 'SpectraFilt™ - Nano-fibra de densidad graduada con separación de agua >95%',
            certifications: 'ISO 9001, ISO/TS 16949, SAE J1858'
        },
        'MACROCORE™ PRECISION': {
            type: 'DuraCore™ Celulosa Optimizada',
            efficiency: '98% @ 5 micrones',
            capacity_grams: 'N/A',
            life_km: '20000',
            life_hours: 'N/A',
            applications: 'Aire motor vehículos ligeros',
            technology: 'DuraCore™ - Celulosa plisada con soporte estructural reforzado',
            certifications: 'ISO 9001, SAE J1858'
        },
        'MACROCORE™ INDUSTRIAL': {
            type: 'OptiFlow™ Nano-Fibra Sintética',
            efficiency: '99.9% @ 2 micrones',
            capacity_grams: 'N/A',
            life_km: '40000',
            life_hours: '2000',
            applications: 'Aire motor equipamiento pesado, elementos de seguridad',
            technology: 'OptiFlow™ - Nano-fibras electrospun 100% sintéticas',
            certifications: 'ISO 9001, ISO/TS 16949, ISO 5011'
        },
        'MICROKAPPA™ PURE': {
            type: 'Electrostático Multi-Capa',
            efficiency: '95% @ 3 micrones',
            capacity_grams: 'N/A',
            life_km: '15000',
            life_hours: 'N/A',
            applications: 'Aire de cabina estándar',
            technology: 'Electrostático multi-capa de alta eficiencia',
            certifications: 'ISO 9001'
        },
        'MICROKAPPA™ PREMIUM': {
            type: 'FiltroMax™ Sistema 4-Etapas',
            efficiency: '98% @ 0.3 micrones',
            capacity_grams: '200 (carbón)',
            life_km: '20000',
            life_hours: 'N/A',
            applications: 'Aire de cabina con máxima purificación',
            technology: 'FiltroMax™ - Sistema multi-etapa con carbón activado y antimicrobiano',
            certifications: 'ISO 9001'
        }
    };
    
    return specs[media] || {
        type: 'German Quality ELIMFILTERS',
        efficiency: 'Tecnología elaborada con IA',
        capacity_grams: 'N/A',
        life_km: 'N/A',
        life_hours: 'N/A',
        applications: 'N/A',
        technology: 'Ingeniería Alemana',
        certifications: 'ISO 9001'
    };
}

/**
 * Get service intervals based on media
 * @param {string} media - ELIMFILTERS product line
 * @returns {object} - Service intervals
 */
function getServiceIntervals(media) {
    const intervals = {
        'ELIMTEK™ ADVANCED': { km: '20000', hours: '500' },
        'ELIMTEK™ SYNTHETIC': { km: '30000', hours: '1000' },
        'ELIMTEK™ ULTRA': { km: '30000', hours: '1000' },
        'MACROCORE™ PRECISION': { km: '20000', hours: 'N/A' },
        'MACROCORE™ INDUSTRIAL': { km: '40000', hours: '2000' },
        'MICROKAPPA™ PURE': { km: '15000', hours: 'N/A' },
        'MICROKAPPA™ PREMIUM': { km: '20000', hours: 'N/A' }
    };
    
    return intervals[media] || { km: '20000', hours: '500' };
}

/**
 * Get ELIMFILTERS proprietary technology description
 * @param {string} media - ELIMFILTERS product line
 * @returns {string} - Technology description
 */
function getTechnology(media) {
    const technologies = {
        'ELIMTEK™ ADVANCED': 'Celulosa blend reforzada con fibras sintéticas y aditivos anti-desgaste',
        'ELIMTEK™ SYNTHETIC': 'Synthetic Blend de Precisión - 50% nano-fibra / 50% celulosa tratada',
        'ELIMTEK™ ULTRA': 'SpectraFilt™ - Nano-fibra multi-capa de densidad graduada con separación de agua',
        'MACROCORE™ PRECISION': 'DuraCore™ - Celulosa plisada optimizada mediante simulación CFD',
        'MACROCORE™ INDUSTRIAL': 'OptiFlow™ - Nano-fibras electrospun 100% sintéticas de 0.2-0.3 micrones',
        'MICROKAPPA™ PURE': 'Electrostático multi-capa de alta eficiencia',
        'MICROKAPPA™ PREMIUM': 'FiltroMax™ - Sistema 4-etapas: Pre-filtro + Electrostático + Carbón + Antimicrobiano'
    };
    
    return technologies[media] || 'German Quality ELIMFILTERS - Tecnología elaborada con IA';
}

/**
 * Get brand tagline
 * @returns {string} - ELIMFILTERS tagline
 */
function getBrandTagline() {
    return 'German Quality ELIMFILTERS - Tecnología elaborada con IA';
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    getMedia,
    getMediaSpecs,
    getServiceIntervals,
    getTechnology,
    getBrandTagline
};
