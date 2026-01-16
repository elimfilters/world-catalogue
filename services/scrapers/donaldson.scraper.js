const axios = require("axios");
const cheerio = require("cheerio");
const getDonaldsonAlternatives = require("./getDonaldsonAlternatives");

module.exports = async function donaldsonScraper(oemCode) {
    try {
        console.log('🔍 [Donaldson] Buscando:', oemCode);
        
        // PASO 1: Buscar el código OEM en Donaldson
        const searchUrl = `https://shop.donaldson.com/store/es-us/search?Ntt=${oemCode}*&Ntk=All&originalSearchTerm=${oemCode}*`;
        console.log('🔍 [Donaldson] Search URL:', searchUrl);
        
        const { data: searchHtml } = await axios.get(searchUrl);
        const $search = cheerio.load(searchHtml);
        
        // Buscar el primer resultado que es el código Donaldson
        let donaldsonCode = null;
        
        // Intentar varios selectores
        ('a[href*="/product/"]').each((i, el) => {
            const href = (el).attr('href');
            const match = href.match(/\/product\/([A-Z0-9]+)\//);
            if (match && !donaldsonCode) {
                donaldsonCode = match[1];
                console.log('✅ [Donaldson] Código encontrado:', donaldsonCode);
            }
        });
        
        if (!donaldsonCode) {
            console.log('❌ [Donaldson] No se encontró código en búsqueda');
            return {
                error: true,
                message: 'No se encontró cross-reference en Donaldson',
                filterType: 'OIL',
                skuBuscado: oemCode,
                idReal: null
            };
        }
        
        // PASO 2: Ir a la página del producto Donaldson
        const productUrl = `https://shop.donaldson.com/store/es-us/product/${donaldsonCode}/80`;
        console.log('🔍 [Donaldson] Product URL:', productUrl);
        
        const { data: html } = await axios.get(productUrl);
        const $ = cheerio.load(html);
        
        // Extraer descripción
        const descripcion = .product-name.first().text().trim();
        console.log('📝 [Donaldson] Descripción:', descripcion);
        
        // Detectar tipo basado en descripción
        const textoBusqueda = descripcion.toLowerCase();
        const breadcrumb = .breadcrumb.text().toLowerCase();
        let filterType = 'OIL'; // Default
        
        if (textoBusqueda.includes('fuel') || textoBusqueda.includes('combustible') || breadcrumb.includes('fuel')) {
            filterType = 'FUEL';
        } else if (textoBusqueda.includes('air') || textoBusqueda.includes('aire') || breadcrumb.includes('air')) {
            filterType = 'AIR';
        } else if (textoBusqueda.includes('hydraulic') || breadcrumb.includes('hydraulic')) {
            filterType = 'HYDRAULIC';
        } else if (textoBusqueda.includes('coolant') || breadcrumb.includes('coolant')) {
            filterType = 'COOLANT';
        } else if (textoBusqueda.includes('cabin') || breadcrumb.includes('cabin')) {
            filterType = 'CABIN';
        } else if (textoBusqueda.includes('lube') || textoBusqueda.includes('lubricant') || textoBusqueda.includes('oil')) {
            filterType = 'OIL';
        }
        
        console.log('🏷️ [Donaldson] Tipo detectado:', filterType);
        
        // Especificaciones
        const specs = {};
        .spec-table tr.each((i, el) => {
            const label = .find("td").eq(0).text().trim();
            const value = .find("td").eq(1).text().trim();
            if (label && value) specs[label] = value;
        });
        
        // Cross references
        const alternativos = [];
        div#crossReferencesList .cross-reference-number.each((i, el) => {
            const val = .text().trim();
            if (val) alternativos.push(val);
        });
        
        // Productos alternativos (Puppeteer)
        const productosAlternativos = await getDonaldsonAlternatives(productUrl);
        
        console.log('✅ [Donaldson] Scraping completo');
        
        return {
            filterType,
            skuBuscado: oemCode,
            idReal: donaldsonCode,
            descripcion,
            especificaciones: specs,
            alternativos,
            productosAlternativos,
            urlFinal: productUrl,
            cantidadEspecificaciones: Object.keys(specs).length,
            cantidadAlternativos: alternativos.length,
            timestamp: new Date().toISOString(),
            v: "SEARCH_FLOW_v1"
        };
        
    } catch (error) {
        console.error("🔴 [Donaldson] ERROR:", error.message);
        return {
            error: true,
            message: error.message,
            filterType: 'OIL',
            skuBuscado: oemCode,
            idReal: null
        };
    }
};

