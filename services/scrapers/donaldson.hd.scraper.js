const axios = require("axios");
const cheerio = require("cheerio");

module.exports = async function donaldsonHD(code) {
    const clean = code.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    const headers = { "User-Agent": "Mozilla/5.0" };

    // 1) Direct product
    try {
        const directUrl = `https://shop.donaldson.com/store/es-us/product/${clean}/80`;
        const { data } = await axios.get(directUrl, { headers });
        const $ = cheerio.load(data);
        const title = $(".product-name").first().text().trim();
        if (title) {
            const specs = {};
            $(".spec-table tr").each((i, el) => {
                const k = $(el).find("td").eq(0).text().trim();
                const v = $(el).find("td").eq(1).text().trim();
                if (k && v) specs[k] = v;
            });
            const alternativos = [];
            $("div#crossReferencesList .cross-reference-number").each((i, el) => {
                const val = $(el).text().trim();
                if (val) alternativos.push(val);
            });
            return {
                skuBuscado: clean,
                idReal: clean,
                descripcion: title,
                especificaciones: specs,
                alternativos,
                urlFinal: directUrl,
                cantidadEspecificaciones: Object.keys(specs).length,
                cantidadAlternativos: alternativos.length,
                timestamp: new Date().toISOString(),
                v: "DONALDSON_HD_v1"
            };
        }
    } catch {}

    // 2) Search catalog
    try {
        const searchUrl = `https://shop.donaldson.com/store/es-us/search?N=4130398073&catNav=true&Search=${clean}`;
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
        const alternativos2 = [];
        $f("div#crossReferencesList .cross-reference-number").each((i, el) => {
            const val = $f(el).text().trim();
            if (val) alternativos2.push(val);
        });
        return {
            skuBuscado: clean,
            idReal: foundSku,
            descripcion: desc,
            especificaciones: specs2,
            alternativos: alternativos2,
            urlFinal: finalUrl,
            cantidadEspecificaciones: Object.keys(specs2).length,
            cantidadAlternativos: alternativos2.length,
            timestamp: new Date().toISOString(),
            v: "DONALDSON_HD_v1"
        };
    } catch {}

    return null;
};
