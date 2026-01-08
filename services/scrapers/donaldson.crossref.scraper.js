const axios = require("axios");
const cheerio = require("cheerio");

module.exports = async function donaldsonCrossReference(code) {
    const cleanCode = code.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    const headers = { "User-Agent": "Mozilla/5.0" };

    // 1) Intentar producto directo
    const directUrl = `https://shop.donaldson.com/store/es-us/product/${cleanCode}/80`;
    try {
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
            return { skuBuscado: cleanCode, idReal: cleanCode, descripcion: title, especificaciones: specs, urlFinal: directUrl };
        }
    } catch {}

    # 2) Búsqueda en catálogo maestro
    const searchUrl = `https://shop.donaldson.com/store/es-us/search?N=4130398073&catNav=true&Search=${cleanCode}`;
    try {
        const { data: searchHtml } = await axios.get(searchUrl, { headers });
        const $s = cheerio.load(searchHtml);
        let foundSku = null;
        $s(".product-tile").each((i, el) => {
            const sku = $s(el).find(".product-number").text().trim();
            if (sku) { foundSku = sku; return false; }
        });
        if (!foundSku) return null;

        # 3) Scrape detalle real
        const finalUrl = `https://shop.donaldson.com/store/es-us/product/${foundSku}/80`;
        const { data: finalHtml } = await axios.get(finalUrl, { headers });
        const $f = cheerio.load(finalHtml);
        const desc = $f(".product-name").first().text().trim();
        const specs2 = {};
        $f(".spec-table tr").each((i, el) => {
            const k = $f(el).find("td").eq(0).text().trim();
            const v = $f(el).find("td").eq(1).text().trim();
            if (k && v) specs2[k] = v;
        });
        return { skuBuscado: cleanCode, idReal: foundSku, descripcion: desc, especificaciones: specs2, urlFinal: finalUrl };
    } catch {
        return null;
    }
};
