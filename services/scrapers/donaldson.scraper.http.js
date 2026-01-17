const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async function donaldsonScraperHTTP(oemCode) {
    try {
        console.log('🔍 [Donaldson HTTP] Buscando:', oemCode);
        
        const digitsMatch = oemCode.match(/(\d{4,6})$/);
        if (!digitsMatch) {
            console.log('❌ [Donaldson] Código inválido:', oemCode);
            return { error: true, message: 'Código inválido', filterType: 'OIL', skuBuscado: oemCode, idReal: null };
        }

        const donaldsonCode = 'P55' + digitsMatch[1];
        const productUrl = `https://shop.donaldson.com/store/es-us/product/${donaldsonCode}/80`;
        
        console.log('📡 [Donaldson] URL:', productUrl);

        const response = await axios.get(productUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            },
            timeout: 10000
        });

        const $ = cheerio.load(response.data);
        const descripcion = $('.prodSubTitle').text().trim();
        
        console.log('📝 [Donaldson] Descripción:', descripcion);

        if (!descripcion) {
            console.log('❌ [Donaldson] Producto no encontrado');
            return { error: true, message: 'Producto no encontrado', filterType: 'OIL', skuBuscado: oemCode, idReal: null };
        }

        const textoBusqueda = descripcion.toLowerCase();
        let filterType = 'OIL';
        
        if (textoBusqueda.includes('lubricante') || textoBusqueda.includes('lube') || textoBusqueda.includes('oil')) filterType = 'OIL';
        else if (textoBusqueda.includes('combustible') || textoBusqueda.includes('fuel')) filterType = 'FUEL';
        else if (textoBusqueda.includes('aire') || textoBusqueda.includes('air')) filterType = 'AIR';
        else if (textoBusqueda.includes('hidráulico') || textoBusqueda.includes('hydraulic')) filterType = 'HYDRAULIC';
        else if (textoBusqueda.includes('refrigerante') || textoBusqueda.includes('coolant')) filterType = 'COOLANT';

        console.log('🔧 [Donaldson] Tipo detectado:', filterType);

        const especificaciones = {};
        $('.prodSpecInfoDiv .table-striped tr').each((i, row) => {
            const cells = $(row).find('td');
            if (cells.length >= 2) {
                especificaciones[$(cells[0]).text().trim()] = $(cells[1]).text().trim();
            }
        });

        const productosAlternativos = [];
        $('.crossRefDiv .table-striped tbody tr').each((i, row) => {
            const cells = $(row).find('td');
            if (cells.length >= 2) {
                productosAlternativos.push({
                    brand: $(cells[0]).text().trim(),
                    part_number: $(cells[1]).text().trim()
                });
            }
        });

        const productosEquipo = [];
        $('.equipmentDiv .table-striped tbody tr').each((i, row) => {
            const cells = $(row).find('td');
            if (cells.length >= 3) {
                productosEquipo.push({
                    equipment: $(cells[0]).text().trim(),
                    engine: $(cells[1]).text().trim(),
                    year: $(cells[2]).text().trim()
                });
            }
        });

        console.log('📊 [Donaldson] Datos extraídos - Specs:', Object.keys(especificaciones).length, '| CrossRef:', productosAlternativos.length, '| Equipment:', productosEquipo.length);

        return {
            error: false,
            skuBuscado: oemCode,
            idReal: donaldsonCode,
            filterType: filterType,
            descripcion: descripcion,
            especificaciones: especificaciones,
            productosAlternativos: productosAlternativos,
            productosEquipo: productosEquipo,
            referenciaCruzada: productosAlternativos,
            url: productUrl,
            scrapedAt: new Date().toISOString()
        };

    } catch (error) {
        console.error('❌ [Donaldson] Error:', error.message);
        
        if (error.response?.status === 404) {
            return { error: true, message: 'Producto no encontrado en Donaldson', filterType: 'OIL', skuBuscado: oemCode, idReal: null };
        }

        return { error: true, message: error.message, filterType: 'OIL', skuBuscado: oemCode, idReal: null };
    }
};
