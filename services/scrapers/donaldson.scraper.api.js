const axios = require('axios');
const { google } = require('googleapis');

// Mapa de IDs de tabs de Donaldson
const DONALDSON_TAB_IDS = {
    ATTRIBUTES: '20823',
    EQUIPMENT: '80'
};

// Google Sheets ID
const SHEETS_ID = '1ZYI5c0enkuvWAveu8HMaCUk1cek_VDrX8GtgKW7VP6U';

async function getDonaldsonCodeFromSheets(oemCode) {
    try {
        // Aquí deberías implementar la búsqueda en Google Sheets
        // Por ahora, retornamos null para usar el fallback
        console.log('[Donaldson API] Buscando en Sheets:', oemCode);
        return null;
    } catch (error) {
        console.error('[Donaldson API] Error en Sheets:', error.message);
        return null;
    }
}

function constructDonaldsonCode(oemCode) {
    // Fallback: intentar construir código
    const digitsMatch = oemCode.match(/(\d{4,6})$/);
    if (!digitsMatch) return null;
    
    // Extraer prefijo del código OEM para determinar la serie de Donaldson
    const prefix = oemCode.match(/^([A-Z]+)/)?.[1] || '';
    
    // Mapeo de prefijos OEM a series de Donaldson
    const prefixMap = {
        'LF': 'P55',  // Lube filters
        'FF': 'P55',  // Fuel filters  
        'AF': 'P60',  // Air filters
        'FS': 'P55',  // Fuel separators
        'HF': 'P16',  // Hydraulic filters
        'P5': 'P55',  // Ya es Donaldson
        'P6': 'P60'   // Ya es Donaldson
    };
    
    const donaldsonPrefix = prefixMap[prefix] || 'P55';
    const donaldsonCode = donaldsonPrefix + digitsMatch[1];
    
    console.log(`[Donaldson API] Construido: ${oemCode} → ${donaldsonCode}`);
    return donaldsonCode;
}

module.exports = async function donaldsonScraperAPI(oemCode) {
    try {
        console.log('🔍 [Donaldson API] Buscando:', oemCode);
        
        // Paso 1: Intentar obtener código de Sheets
        let donaldsonCode = await getDonaldsonCodeFromSheets(oemCode);
        
        // Paso 2: Si no existe en Sheets, construir código
        if (!donaldsonCode) {
            donaldsonCode = constructDonaldsonCode(oemCode);
        }
        
        if (!donaldsonCode) {
            return { error: true, message: 'Código inválido', filterType: 'OIL', skuBuscado: oemCode, idReal: null };
        }
        
        // Paso 3: Llamar a la API de Donaldson
        const apiUrl = `https://shop.donaldson.com/store/es-us/fetchProductAttrAndRecentlyViewed?fid=${DONALDSON_TAB_IDS.ATTRIBUTES}&fpp=${donaldsonCode}`;
        
        console.log('📡 [Donaldson API] URL:', apiUrl);

        const response = await axios.get(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json, */*',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': `https://shop.donaldson.com/store/es-us/product/${donaldsonCode}/${DONALDSON_TAB_IDS.ATTRIBUTES}`
            },
            timeout: 10000
        });

        const data = response.data;
        
        if (!data || !data.productAttributesResponse) {
            console.log('❌ [Donaldson] Producto no encontrado:', donaldsonCode);
            return { error: true, message: 'Producto no encontrado', filterType: 'OIL', skuBuscado: oemCode, idReal: null };
        }

        const recentProducts = data.recentlyViewedProductResponse?.recentlyViewedProducts || [];
        const mainProduct = recentProducts.find(p => p.basePartNumber === donaldsonCode) || recentProducts[0];
        
        const descripcion = mainProduct?.description || '';
        console.log('📝 [Donaldson API] Descripción:', descripcion);

        const textoBusqueda = descripcion.toLowerCase();
        let filterType = 'OIL';
        
        if (textoBusqueda.includes('lubricante') || textoBusqueda.includes('lube') || textoBusqueda.includes('oil')) filterType = 'OIL';
        else if (textoBusqueda.includes('combustible') || textoBusqueda.includes('fuel')) filterType = 'FUEL';
        else if (textoBusqueda.includes('aire') || textoBusqueda.includes('air')) filterType = 'AIR';
        else if (textoBusqueda.includes('hidráulico') || textoBusqueda.includes('hydraulic')) filterType = 'HYDRAULIC';
        else if (textoBusqueda.includes('refrigerante') || textoBusqueda.includes('coolant')) filterType = 'COOLANT';

        const attrs = data.productAttributesResponse;
        const especificaciones = attrs.dynamicAttributes || {};
        const packageDims = attrs.packageDimensions || {};
        const otherInfo = attrs.otherInformation || {};

        const allSpecs = { ...especificaciones, ...packageDims, ...otherInfo };

        const productosAlternativos = recentProducts
            .filter(p => p.basePartNumber !== donaldsonCode)
            .map(p => ({
                brand: 'Donaldson',
                part_number: p.basePartNumber,
                description: p.description
            }));

        console.log('✅ [Donaldson API] Extracción exitosa - Specs:', Object.keys(allSpecs).length, 'CrossRef:', productosAlternativos.length);

        return {
            error: false,
            skuBuscado: oemCode,
            idReal: donaldsonCode,
            filterType: filterType,
            descripcion: descripcion,
            especificaciones: allSpecs,
            productosAlternativos: productosAlternativos,
            productosEquipo: [],
            referenciaCruzada: productosAlternativos,
            imageUrl: mainProduct?.imageUrl || '',
            productUrl: `https://shop.donaldson.com${mainProduct?.productUrl || ''}`,
            scrapedAt: new Date().toISOString(),
            source: 'donaldson_api'
        };

    } catch (error) {
        console.error('❌ [Donaldson API] Error:', error.message);
        
        if (error.response?.status === 404) {
            return { error: true, message: 'Producto no encontrado en Donaldson', filterType: 'OIL', skuBuscado: oemCode, idReal: null };
        }

        return { error: true, message: error.message, filterType: 'OIL', skuBuscado: oemCode, idReal: null };
    }
};
