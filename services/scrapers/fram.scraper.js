const axios = require("axios");
const cheerio = require("cheerio");

module.exports = async function framScraper(code) {
    try {
        const url = `https://www.fram.com/fram-extra-guard-oil-filter-spin-on-${code}`;
        const { data: html } = await axios.get(url, {
            headers: { "User-Agent": "Mozilla/5.0" }
        });
        const $ = cheerio.load(html);

        const title = $("h1").first().text().trim();
        const description = $(".product-description").first().text().trim() || title;

        let specs = {};
        $(".product-features li").each((i, el) => {
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
        return { success: false, error: error.message };
    }
};
