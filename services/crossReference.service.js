const FilterClassification = require('../models/FilterClassification');
const path = require('path');
const fs = require('fs').promises;
const donaldsonCrossRefScraper = require('./scrapers/donaldson.crossref.scraper');
const framCrossRefScraper = require('./scrapers/fram.crossref.scraper');

/**
 * Cross-reference con Donaldson (solo para HD)
 */
async function crossReferenceToDonaldson(filterCode, filterType, duty) {
    try {
        console.log('[CrossRef] Scraping Donaldson for:', filterCode);
        const result = await donaldsonCrossRefScraper(filterCode);
        
        if (result && result.idReal) {
            console.log('[CrossRef] Found Donaldson code:', result.idReal);
            return result.idReal;
        }
        
        console.log('[CrossRef] No Donaldson code found');
        return null;
    } catch (error) {
        console.error('[CrossRef] Error with Donaldson:', error.message);
        return null;
    }
}

/**
 * Cross-reference con FRAM (solo para LD)
 */
async function crossReferenceToFRAM(filterCode, filterType, duty) {
    try {
        console.log('[CrossRef] Scraping FRAM for:', filterCode);
        const result = await framCrossRefScraper(filterCode);
        
        if (result && result.idReal) {
            console.log('[CrossRef] Found FRAM code:', result.idReal);
            return result.idReal;
        }
        
        console.log('[CrossRef] No FRAM code found');
        return null;
    } catch (error) {
        console.error('[CrossRef] Error with FRAM:', error.message);
        return null;
    }
}

/**
 * Genera el SKU de Elimfilters basado en el código de referencia
 */
function generateElimfiltersSKU(referenceCode, filterType, duty) {
    if (!referenceCode) return null;

    // HD tiene todos los prefijos
    const hdPrefixMap = {
        'AIR': 'EA1',
        'OIL': 'EL8',
        'FUEL': 'EF9',
        'HYDRAULIC': 'EH6',
        'COOLANT': 'ED4',
        'WATER': 'EW7'
    };

    // LD solo tiene 4 prefijos
    const ldPrefixMap = {
        'AIR': 'EA1',
        'OIL': 'EL8',
        'FUEL': 'EF9',
        'CABIN': 'EC1'
    };

    const prefixMap = duty === 'LD' ? ldPrefixMap : hdPrefixMap;
    const prefix = prefixMap[filterType] || 'EL8';

    // Extraer últimos 4 caracteres alfanuméricos
    const cleaned = referenceCode.replace(/[^A-Z0-9]/gi, '');
    const last4 = cleaned.slice(-4);

    return `${prefix}${last4}`;
}

/**
 * Realiza cross-reference según el duty detectado
 */
async function performCrossReference(filterCode, filterType, duty) {
    console.log('[CrossRef] Starting for:', filterCode, '| Type:', filterType, '| Duty:', duty);

    let donaldsonCode = null;
    let framCode = null;
    let elimfiltersSKU = null;
    let finalDuty = duty;

    try {
        if (duty === 'HD') {
            donaldsonCode = await crossReferenceToDonaldson(filterCode, filterType, 'HD');
            if (donaldsonCode) {
                elimfiltersSKU = generateElimfiltersSKU(donaldsonCode, filterType, 'HD');
                console.log('[CrossRef] Generated HD SKU:', elimfiltersSKU);
            }
        }
        else if (duty === 'LD') {
            framCode = await crossReferenceToFRAM(filterCode, filterType, 'LD');
            if (framCode) {
                elimfiltersSKU = generateElimfiltersSKU(framCode, filterType, 'LD');
                console.log('[CrossRef] Generated LD SKU:', elimfiltersSKU);
            }
        }

        const referenceCode = donaldsonCode || framCode;
        
        return {
            crossReferenceCode: referenceCode,
            elimfiltersSKU: elimfiltersSKU,
            crossReferences: referenceCode ? [{
                manufacturer: donaldsonCode ? 'Donaldson' : 'FRAM',
                code: referenceCode,
                duty: finalDuty
            }] : []
        };

    } catch (error) {
        console.error('[CrossRef] Error:', error.message);
        return {
            crossReferenceCode: null,
            elimfiltersSKU: null,
            crossReferences: []
        };
    }
}

module.exports = {
    performCrossReference,
    crossReferenceToDonaldson,
    crossReferenceToFRAM,
    generateElimfiltersSKU
};
