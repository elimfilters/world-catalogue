const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async function donaldsonScraper(code) {
    const sku = code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const searchUrl = `https://shop.donaldson.com/store/en-us/search?keyword=${sku}`;

    try {
        const searchResponse = await axios.get(searchUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const $ = cheerio.load(searchResponse.data);
        const productLink = $('a.product-title__link').first().attr('href');

        if (!productLink) {
            throw new Error(`No se encontró producto Donaldson para código: ${sku}`);
        }

        const productUrl = `https://shop.donaldson.com${productLink}`;
        const productResponse = await axios.get(productUrl);
        const $$ = cheerio.load(productResponse.data);

        const title = $$('h1.product-title').text().trim();

        const specs = {};
        $$('.product-attributes__list-item').each((i, el) => {
            const key = $$(el).find('.product-attributes__label').text().trim();
            const value = $$(el).find('.product-attributes__value').text().trim();
            if (key && value) specs[key] = value;
        });

        const alternates = [];
        $$('.cross-reference__list-item').each((i, el) => {
            const ref = $$(el).text().trim();
            if (ref) alternates.push(ref);
        });

        return {
            skuBuscado: sku,
            idReal: productLink.split('/').pop(),
            descripcion: title,
            especificaciones: specs,
            alternativos: alternates,
            urlFinal: productUrl,
            cantidadEspecificaciones: Object.keys(specs).length,
            cantidadAlternativos: alternates.length,
            timestamp: new Date().toISOString(),
            v: 'FINAL_TABLE_BASED_v1'
        };

    } catch (error) {
        console.error("🔴 Error en donaldsonScraper:", error);
        throw error;
    }
};
