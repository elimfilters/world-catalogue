const FilterClassification = require('../models/FilterClassification');
const path = require('path');
const fs = require('fs').promises;
const donaldsonCrossRefScraper = require('./scrapers/donaldson.crossref.scraper');
const framCrossRefScraper = require('./scrapers/fram.crossref.scraper');

async function crossReferenceToDonaldson(filterCode, filterType, duty) {
    try {
        console.log('[CrossRef] Scraping Donaldson for:', filterCode);
        const result = await donaldsonCrossRefScraper(filterCode);
        
        if (result && result.idReal) {
            console.log('[CrossRef] Found Donaldson code:', result.idReal);
            return result;
        }
        
        return null;
    } catch (error) {
        console.error('[CrossRef] Error with Donaldson:', error.message);
        return null;
    }
}

async function crossReferenceToFRAM(filterCode, filterType, duty) {
    try {
        console.log('[CrossRef] Scraping FRAM for:', filterCode);
        const result = await framCrossRefScraper(filterCode);
        
        if (result && result.idReal) {
            console.log('[CrossRef] Found FRAM codes:', result.idReal, 
                       'Alternatives:', result.alternativeCodes?.length || 0);
            return result;
        }
        
        return null;
    } catch (error) {
        console.error('[CrossRef] Error with FRAM:', error.message);
        return null;
    }
}

function generateElimfiltersSKU(referenceCode, filterType, duty) {
    if (!referenceCode) return null;

    // LD solo tiene 4 prefijos
    const ldPrefixMap = {
        'AIR': 'EA1',
        'OIL': 'EL8',
        'FUEL': 'EF9',
        'CABIN': 'EC1'
    };

    const prefix = ldPrefixMap[filterType] || 'EL8';

    const cleaned = referenceCode.replace(/[^A-Z0-9]/gi, '');
    const last4 = cleaned.slice(-4);

    return `${prefix}${last4}`;
}

async function performCrossReference(filterCode, filterType, duty) {
    console.log('[CrossRef] Starting for:', filterCode, '| Type:', filterType, '| Duty:', duty);

    let result = null;
    let elimfiltersSKU = null;
    let alternativeSKUs = [];

    try {
        if (duty === 'HD') {
            result = await crossReferenceToDonaldson(filterCode, filterType, 'HD');
            if (result && result.idReal) {
                elimfiltersSKU = generateElimfiltersSKU(result.idReal, filterType, 'HD');
                console.log('[CrossRef] Generated HD SKU:', elimfiltersSKU);
            }
        }
        else if (duty === 'LD') {
            result = await crossReferenceToFRAM(filterCode, filterType, 'LD');
            if (result && result.idReal) {
                // SKU principal (CH - Extra Guard)
                elimfiltersSKU = generateElimfiltersSKU(result.idReal, filterType, 'LD');
                console.log('[CrossRef] Generated LD SKU:', elimfiltersSKU);
                
                // SKUs alternativos (FE, FS, XG, FF, TG, FD)
                if (result.alternativeCodes && result.alternativeCodes.length > 0) {
                    alternativeSKUs = result.alternativeCodes.map(code => ({
                        framCode: code,
                        elimfiltersSKU: generateElimfiltersSKU(code, filterType, 'LD'),
                        technology: 'Alternative'
                    }));
                    console.log('[CrossRef] Generated', alternativeSKUs.length, 'alternative SKUs');
                }
            }
        }

        const referenceCode = result?.idReal || null;
        
        return {
            crossReferenceCode: referenceCode,
            elimfiltersSKU: elimfiltersSKU,
            alternativeSKUs: alternativeSKUs,
            crossReferences: referenceCode ? [{
                manufacturer: duty === 'HD' ? 'Donaldson' : 'FRAM',
                code: referenceCode,
                duty: duty
            }] : [],
            scrapedData: result
        };

    } catch (error) {
        console.error('[CrossRef] Error:', error.message);
        return {
            crossReferenceCode: null,
            elimfiltersSKU: null,
            alternativeSKUs: [],
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
