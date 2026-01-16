const axios = require("axios");
const cheerio = require("cheerio");

module.exports = async function donaldsonCrossRefScraper(code) {
    const cleanCode = code.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    const headers = { "User-Agent": "Mozilla/5.0" };

    console.log("[Donaldson] Searching for:", cleanCode);

    try {
        const directUrl = `https://shop.donaldson.com/store/es-us/product/${cleanCode}/80`;
        console.log("[Donaldson] Trying direct URL:", directUrl);
        const { data: htmlDirect } = await axios.get(directUrl, { headers, timeout: 10000 });
        const $direct = cheerio.load(htmlDirect);
        const title = $direct(".product-name").first().text().trim();
        
        if (title) {
            console.log("[Donaldson] ✅ Found direct:", cleanCode);
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
    } catch (error) {
        console.log("[Donaldson] Direct search failed:", error.message);
    }

    try {
        const searchUrl = `https://shop.donaldson.com/store/es-us/search?N=4130398073&catNav=true&Search=${cleanCode}`;
        console.log("[Donaldson] Trying catalog search:", searchUrl);
        const { data: htmlSearch } = await axios.get(searchUrl, { headers, timeout: 10000 });
        const $s = cheerio.load(htmlSearch);
        
        let foundSku = null;
        $s(".product-tile").each((i, el) => {
            const sku = $s(el).find(".product-number").text().trim();
            if (sku) { 
                foundSku = sku;
                return false;
            }
        });

        if (!foundSku) {
            console.log("[Donaldson] No SKU found in catalog");
            return null;
        }

        console.log("[Donaldson] Found SKU in catalog:", foundSku);
        const finalUrl = `https://shop.donaldson.com/store/es-us/product/${foundSku}/80`;
        const { data: htmlFinal } = await axios.get(finalUrl, { headers, timeout: 10000 });
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

        console.log("[Donaldson] ✅ Found:", foundSku, "with", alternativos.length, "alternatives");
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
    } catch (error) {
        console.error("[Donaldson] Catalog search failed:", error.message);
    }

    console.log("[Donaldson] ❌ No results found");
    return null;
};
