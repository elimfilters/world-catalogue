const axios = require("axios");
const cheerio = require("cheerio");

module.exports = async function framScraper(code) {
    try {
        const url = `https://www.fram.com/fram-extra-guard-oil-filter-spin-on-${code}`;
        const { data: html } = await axios.get(url, {
            headers: { "User-Agent": "Mozilla/5.0" }
        });
        const $ = cheerio.load(html);

        // Título principal
        const title = $("h1, .product-title").first().text().trim();

        // Descripción corta
        const description = $(".product-description, .description").first().text().trim() || title;

        // Especificaciones o características
        let specs = {};
        $(".product-features li, .features-list li").each((i, el) => {
            const text = $(el).text().trim();
            if (text) specs[i] = text;
        });

        return {
            success: true,
            skuBuscado: code.toUpperCase(),
            idReal: code.toUpperCase(),
            descripcion: description,
            especificaciones: specs,
            urlFinal: url
        };
    } catch (error) {
        console.error("🔥 Error en FRAM Scraper:", error.message);
        return { success: false, error: error.message };
    }
};
