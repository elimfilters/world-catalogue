const axios = require("axios");
const cheerio = require("cheerio");

module.exports = async function donaldsonCrossRefScraper(code) {
    const cleanCode = code.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    const headers = { "User-Agent": "Mozilla/5.0" };

    try {
        // Try direct product
        const directUrl = `https://shop.donaldson.com/store/es-us/product/${cleanCode}/80`;
        const { data: htmlDirect } = await axios.get(directUrl, { headers });
        const $direct = cheerio.load(htmlDirect);
        const title = $direct(".product-name").first().text().trim();
        if (title) {
            const specs = {};
            $direct(".spec-table tr").each((i, el) => {
                const k = $direct(el).find("td").eq(0).text().trim();
                const v = $direct(el).find("td").eq(1).text().trim();
                if (k && v) specs[k] = v;
            });
            return {
                skuBuscado: cleanCode,
                idReal: cleanCode,
                descripcion: title,
                especificaciones: specs,
                alternativos: [],
                urlFinal: directUrl,
                cantidadEspecificaciones: Object.keys(specs).length,
                cantidadAlternativos: 0,
                timestamp: new Date().toISOString(),
                v: "DONALDSON_CROSSREF_v1"
            };
        }
    } catch {}

    try {
        // Search catalog
        const searchUrl = `https://shop.donaldson.com/store/es-us/search?N=4130398073&catNav=true&Search=${cleanCode}`;
        const { data: htmlSearch } = await axios.get(searchUrl, { headers });
        const $s = cheerio.load(htmlSearch);
        let foundSku = null;
        $s(".product-tile").each((i, el) => {
            const sku = $s(el).find(".product-number").text().trim();
            if (sku) { foundSku = sku; return false; }
        });
        if (!foundSku) return null;

        const finalUrl = `https://shop.donaldson.com/store/es-us/product/${foundSku}/80`;
        const { data: htmlFinal } = await axios.get(finalUrl, { headers });
        const $f = cheerio.load(htmlFinal);

        const desc = $f(".product-name").first().text().trim();
        const specs2 = {};
        $f(".spec-table tr").each((i, el) => {
            const k = $f(el).find("td").eq(0).text().trim();
            const v = $f(el).find("td").eq(1).text().trim();
            if (k && v) specs2[k] = v;
        });

        const alternativos = [];
        $f("div#crossReferencesList .cross-reference-number").each((i, el) => {
            const val = $f(el).text().trim();
            if (val) alternativos.push(val);
        });

        return {
            skuBuscado: cleanCode,
            idReal: foundSku,
            descripcion: desc,
            especificaciones: specs2,
            alternativos,
            urlFinal: finalUrl,
            cantidadEspecificaciones: Object.keys(specs2).length,
            cantidadAlternativos: alternativos.length,
            timestamp: new Date().toISOString(),
            v: "DONALDSON_CROSSREF_v1"
        };
    } catch {}
    return null;
};
