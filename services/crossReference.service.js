const FilterClassification = require('../models/FilterClassification');
const path = require('path');
const fs = require('fs').promises;

/**
 * Cross-reference con Donaldson (solo para HD)
 */
async function crossReferenceToDonaldson(filterCode, filterType, duty) {
    try {
        const filePath = path.join(__dirname, '../data/donaldson_hd.json');
        const data = await fs.readFile(filePath, 'utf8');
        const donaldsonData = JSON.parse(data);

        const match = donaldsonData.find(item => 
            item.competitive && 
            item.competitive.toLowerCase() === filterCode.toLowerCase()
        );

        return match ? match.donaldson : null;
    } catch (error) {
        console.error('Error reading Donaldson data:', error.message);
        return null;
    }
}

/**
 * Cross-reference con FRAM (solo para LD)
 */
async function crossReferenceToFRAM(filterCode, filterType, duty) {
    try {
        const filePath = path.join(__dirname, '../data/fram_ld.json');
        const data = await fs.readFile(filePath, 'utf8');
        const framData = JSON.parse(data);

        const match = framData.find(item => 
            item.competitive && 
            item.competitive.toLowerCase() === filterCode.toLowerCase()
        );

        return match ? match.fram : null;
    } catch (error) {
        console.error('Error reading FRAM data:', error.message);
        return null;
    }
}

/**
 * Genera el SKU de Elimfilters basado en el código de referencia
 */
function generateElimfiltersSKU(referenceCode, filterType) {
    if (!referenceCode) return null;

    // Mapeo de prefijos según tipo de filtro
    const prefixMap = {
        'AIR': 'EL4',
        'OIL': 'EL8',
        'FUEL': 'EL3',
        'HYDRAULIC': 'EL9',
        'COOLANT': 'EL2'
    };

    const prefix = prefixMap[filterType] || 'EL';
    
    // Extraer los dígitos del código de referencia
    const digits = referenceCode.replace(/[^0-9]/g, '');
    
    return `${prefix}${digits}`;
}

/**
 * Realiza cross-reference según el duty detectado
 * HD → Solo Donaldson
 * LD → Solo FRAM
 * HD/LD → Primero Donaldson HD, si no encuentra → FRAM LD
 */
async function performCrossReference(filterCode, filterType, duty) {
    console.log(`🔄 Iniciando cross-reference para: ${filterCode}`);
    console.log(`   Tipo: ${filterType}`);
    console.log(`   Duty: ${duty}`);

    let donaldsonCode = null;
    let framCode = null;
    let elimfiltersSKU = null;
    let finalDuty = duty;

    try {
        // CASO 1: HD → Solo buscar en Donaldson
        if (duty === 'HD') {
            console.log(`   🔍 Cross-reference con Donaldson (HD)...`);
            donaldsonCode = await crossReferenceToDonaldson(filterCode, filterType, 'HD');
            
            if (donaldsonCode) {
                console.log(`   ✅ Donaldson code: ${donaldsonCode}`);
            } else {
                console.log(`   ❌ No se encontró en Donaldson HD`);
            }
        }
        
        // CASO 2: LD → Solo buscar en FRAM
        else if (duty === 'LD') {
            console.log(`   🔍 Cross-reference con FRAM (LD)...`);
            framCode = await crossReferenceToFRAM(filterCode, filterType, 'LD');
            
            if (framCode) {
                console.log(`   ✅ FRAM code: ${framCode}`);
            } else {
                console.log(`   ❌ No se encontró en FRAM LD`);
            }
        }
        
        // CASO 3: HD/LD → Buscar primero en Donaldson HD, luego en FRAM LD
        else if (duty === 'HD/LD') {
            console.log(`   🔍 Intentando Donaldson (HD) primero...`);
            donaldsonCode = await crossReferenceToDonaldson(filterCode, filterType, 'HD');
            
            if (donaldsonCode) {
                console.log(`   ✅ Encontrado en Donaldson HD: ${donaldsonCode}`);
                finalDuty = 'HD'; // El filtro es realmente HD
            } else {
                console.log(`   ⚠️  No encontrado en Donaldson HD`);
                console.log(`   🔍 Intentando FRAM (LD) como alternativa...`);
                framCode = await crossReferenceToFRAM(filterCode, filterType, 'LD');
                
                if (framCode) {
                    console.log(`   ✅ Encontrado en FRAM LD: ${framCode}`);
                    finalDuty = 'LD'; // El filtro es realmente LD
                } else {
                    console.log(`   ❌ No encontrado en ninguna base`);
                }
            }
        }
        
        // CASO 4: Duty no reconocido
        else {
            console.log(`   ⚠️  Duty no reconocido: ${duty}`);
            console.log(`   ℹ️  Solo se admiten: HD, LD o HD/LD`);
        }

        // Generar SKU de Elimfilters si encontramos algún código
        const referenceCode = donaldsonCode || framCode;
        if (referenceCode) {
            elimfiltersSKU = generateElimfiltersSKU(referenceCode, filterType);
            console.log(`   ✅ SKU generado: ${elimfiltersSKU}`);
        }

        return {
            crossReferenceCode: referenceCode,
            elimfiltersSKU: elimfiltersSKU,
            crossReferences: referenceCode ? [{
                manufacturer: donaldsonCode ? 'Donaldson' : 'FRAM',
                code: referenceCode,
                duty: finalDuty // Duty real detectado
            }] : []
        };

    } catch (error) {
        console.error(`❌ Error en cross-reference:`, error.message);
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