const axios = require('axios');

// Mapa de IDs de tabs de Donaldson
const DONALDSON_TAB_IDS = {
    ATTRIBUTES: '20823',      // Atributos + Cross Reference
    EQUIPMENT: '80',          // Equipos compatibles
    SPECIFICATIONS: '20823'   // Especificaciones técnicas
};

module.exports = async function donaldsonScraperAPI(oemCode) {
    try {
        console.log('🔍 [Donaldson API] Buscando:', oemCode);
        
        const digitsMatch = oemCode.match(/(\d{4,6})$/);
        if (!digitsMatch) {
            console.log('❌ [Donaldson] Código inválido:', oemCode);
            return { error: true, message: 'Código inválido', filterType: 'OIL', skuBuscado: oemCode, idReal: null };
        }

        const donaldsonCode = 'P55' + digitsMatch[1];
        
        // URL de la API JSON de Donaldson
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
            console.log('❌ [Donaldson] No se encontraron datos del producto');
            return { error: true, message: 'Producto no encontrado', filterType: 'OIL', skuBuscado: oemCode, idReal: null };
        }

        // Extraer descripción del producto
        const recentProducts = data.recentlyViewedProductResponse?.recentlyViewedProducts || [];
        const mainProduct = recentProducts.find(p => p.basePartNumber === donaldsonCode) || recentProducts[0];
        
        const descripcion = mainProduct?.description || '';
        console.log('📝 [Donaldson API] Descripción:', descripcion);

        // Detectar tipo de filtro desde la descripción
        const textoBusqueda = descripcion.toLowerCase();
        let filterType = 'OIL';
        
        if (textoBusqueda.includes('lubricante') || textoBusqueda.includes('lube') || textoBusqueda.includes('oil')) filterType = 'OIL';
        else if (textoBusqueda.includes('combustible') || textoBusqueda.includes('fuel')) filterType = 'FUEL';
        else if (textoBusqueda.includes('aire') || textoBusqueda.includes('air')) filterType = 'AIR';
        else if (textoBusqueda.includes('hidráulico') || textoBusqueda.includes('hydraulic')) filterType = 'HYDRAULIC';
        else if (textoBusqueda.includes('refrigerante') || textoBusqueda.includes('coolant')) filterType = 'COOLANT';

        console.log('🔧 [Donaldson API] Tipo detectado:', filterType);

        // Extraer especificaciones del JSON
        const attrs = data.productAttributesResponse;
        const especificaciones = attrs.dynamicAttributes || {};
        const packageDims = attrs.packageDimensions || {};
        const otherInfo = attrs.otherInformation || {};

        // Combinar todas las especificaciones
        const allSpecs = {
            ...especificaciones,
            ...packageDims,
            ...otherInfo
        };

        console.log('📊 [Donaldson API] Especificaciones:', Object.keys(allSpecs).length);

        // Extraer productos alternativos (cross-reference) de recentlyViewed
        const productosAlternativos = recentProducts
            .filter(p => p.basePartNumber !== donaldsonCode)
            .map(p => ({
                brand: 'Donaldson',
                part_number: p.basePartNumber,
                description: p.description
            }));

        console.log('🔄 [Donaldson API] Cross-references encontrados:', productosAlternativos.length);

        return {
            error: false,
            skuBuscado: oemCode,
            idReal: donaldsonCode,
            filterType: filterType,
            descripcion: descripcion,
            especificaciones: allSpecs,
            productosAlternativos: productosAlternativos,
            productosEquipo: [],  // Requiere otro endpoint
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
