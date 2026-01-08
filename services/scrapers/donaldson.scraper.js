const axios = require("axios");
const cheerio = require("cheerio");
const getDonaldsonAlternatives = require("./getDonaldsonAlternatives");

module.exports = async function donaldsonScraper(code) {
    const url = `https://shop.donaldson.com/store/en-us/product/${code}/80`;
    try {
        const { data: html } = await axios.get(url);
        const $ = cheerio.load(html);

        const descripcion = $(".product-name").first().text().trim();

        const specs = {};
        $(".spec-table tr").each((i, el) => {
            const label = $(el).find("td").eq(0).text().trim();
            const value = $(el).find("td").eq(1).text().trim();
            if (label && value) specs[label] = value;
        });

        const alternativos = [];
        $("#crossReferencesList .cross-reference-number").each((i, el) => {
            const val = $(el).text().trim();
            if (val) alternativos.push(val);
        });

        const productosAlternativos = await getDonaldsonAlternatives(url);

        return {
            skuBuscado: code,
            idReal: code,
            descripcion,
            especificaciones: specs,
            alternativos,
            productosAlternativos,
            urlFinal: url,
            cantidadEspecificaciones: Object.keys(specs).length,
            cantidadAlternativos: alternativos.length,
            timestamp: new Date().toISOString(),
            v: "FINAL_TABLE_BASED_v1"
        };
    } catch (error) {
        console.error("🔴 ERROR EN DONALDSON SCRAPER:", error.message);
        return { error: true, message: error.message };
    }
};
