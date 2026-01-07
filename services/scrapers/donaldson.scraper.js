const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeDonaldson(sku) {
    const cleanSku = sku.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    // Intentamos búsqueda general en lugar de URL directa de producto
    const searchUrl = `https://shop.donaldson.com/store/en-us/search?Ntt=${cleanSku}`;

    const config = {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' },
        timeout: 15000
    };

    try {
        const { data } = await axios.get(searchUrl, config);
        const $ = cheerio.load(data);

        // Si hay múltiples resultados o es una referencia cruzada, Donaldson muestra una tabla.
        // Buscamos el link del primer producto que aparezca.
        let productUrl = null;
        const firstProductLink = $('.product-info-name a').first().attr('href');
        
        if (firstProductLink) {
            const finalUrl = `https://shop.donaldson.com${firstProductLink}`;
            const detailPage = await axios.get(finalUrl, config);
            const $detail = cheerio.load(detailPage.data);
            
            // Extraer specs de la página de detalle
            const specs = {};
            $detail('.product-attribute-list li').each((i, el) => {
                const label = $detail(el).find('.attr-label').text().trim().replace(':', '');
                const value = $detail(el).find('.attr-value').text().trim();
                if (label) specs[label] = value;
            });

            return {
                main_product: {
                    SKU_SEARCHED: cleanSku,
                    DONALDSON_EQUIVALENT: $detail('.product-title').text().trim(),
                    OUTER_DIAMETER: specs['Outer Diameter'] || 'N/A',
                    THREAD_SIZE: specs['Thread Size'] || 'N/A',
                    LENGTH: specs['Length'] || 'N/A',
                    TRILOGY_EFFICIENCY: $detail('.alternative-products').text().includes('Blue') ? 'High' : 'Standard',
                    SOURCE: "PRODUCTION_BLINDADO_CROSSREF"
                }
            };
        }

        return { error: "No se encontró referencia para este SKU", sku: cleanSku };
    } catch (error) {
        return { error: "Error de conexión", message: error.message };
    }
}
module.exports = scrapeDonaldson;
