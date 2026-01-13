const axios = require("axios");
const cheerio = require("cheerio");

module.exports = async function framCrossRefScraper(code) {
    const cleanCode = code.replace(/[^A-Za-z0-9\-]/g, "").toUpperCase();
    const headers = { "User-Agent": "Mozilla/5.0" };
    
    try {
        console.log('[FRAM CrossRef] Searching for:', cleanCode);
        
        // Buscar en FRAM usando el código OEM
        const searchUrl = `https://www.fram.com/search?q=${cleanCode}`;
        const { data: htmlSearch } = await axios.get(searchUrl, { headers, timeout: 10000 });
        const $ = cheerio.load(htmlSearch);
        
        let framCode = null;
        
        // Buscar el código FRAM en los resultados
        $('a[href*="/products/"]').each((i, el) => {
            const href = $(el).attr('href');
            const match = href.match(/\/products\/([A-Z]{2}\d+[A-Z]?)/i);
            if (match) {
                framCode = match[1].toUpperCase();
                return false; // break
            }
        });
        
        if (!framCode) {
            console.log('[FRAM CrossRef] No FRAM code found for:', cleanCode);
            return null;
        }
        
        console.log('[FRAM CrossRef] Found FRAM code:', framCode);
        
        // Ahora scrapear la página del producto FRAM
        const productUrl = `https://www.fram.com/products/${framCode.toLowerCase()}`;
        const { data: htmlProduct } = await axios.get(productUrl, { headers, timeout: 10000 });
        const $p = cheerio.load(htmlProduct);
        
        const title = $p('h1.product-name, h1').first().text().trim();
        const description = $p('.product-description, .description').first().text().trim();
        
        const specs = {};
        $p('.specifications tr, .specs tr').each((i, el) => {
            const key = $p(el).find('td, th').eq(0).text().trim();
            const val = $p(el).find('td').eq(1).text().trim();
            if (key && val) specs[key] = val;
        });
        
        return {
            skuBuscado: cleanCode,
            idReal: framCode,
            descripcion: description || title,
            especificaciones: specs,
            urlFinal: productUrl,
            cantidadEspecificaciones: Object.keys(specs).length,
            timestamp: new Date().toISOString(),
            v: "FRAM_CROSSREF_v1"
        };
        
    } catch (error) {
        console.error('[FRAM CrossRef] Error:', error.message);
        return null;
    }
};
