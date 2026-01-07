const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeDonaldson(sku) {
    const cleanSku = sku.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const url = `https://shop.donaldson.com/store/es-us/search?Ntt=${cleanSku}`;

    try {
        const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(data);
        
        // Buscamos el link de la ficha técnica real
        const productLink = $('.product-info-name a').first().attr('href');
        if (!productLink) return { error: "No encontrado" };

        const ficha = await axios.get(`https://shop.donaldson.com${productLink}`);
        const $f = cheerio.load(ficha.data);

        const resultados = [];

        // BARRIDO GENERAL: Capturamos CUALQUIER producto en la sección de alternativas (como en tu imagen)
        $f('.alternative-products .product-card, .upgrade-options .product-card').each((i, el) => {
            const realID = $f(el).find('.sku-number, .product-sku').text().trim();
            if (realID) {
                const lastFour = realID.replace(/[^0-9]/g, '').slice(-4);
                resultados.push({
                    DONALDSON_ID: realID,
                    ELIM_SKU: `EL8${lastFour}`,
                    TECNOLOGIA: realID.startsWith('DB') ? 'Donaldson Blue (Nanofiber)' : 'Standard'
                });
            }
        });

        // Si no encontró alternativas, al menos devolvemos el principal
        if (resultados.length === 0) {
            const mainID = $f('.product-title').text().trim();
            const lastFour = mainID.replace(/[^0-9]/g, '').slice(-4);
            resultados.push({ DONALDSON_ID: mainID, ELIM_SKU: `EL8${lastFour}`, TECNOLOGIA: 'Main' });
        }

        return { success: true, all_variants: resultados };
    } catch (e) {
        return { error: e.message };
    }
}
module.exports = scrapeDonaldson;
