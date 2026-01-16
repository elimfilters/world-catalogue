const axios = require("axios");
const cheerio = require("cheerio");
const getDonaldsonAlternatives = require("./getDonaldsonAlternatives");

module.exports = async function donaldsonScraper(oemCode) {
    try {
        console.log('🔍 [Donaldson] Buscando:', oemCode);
        
        const digitsMatch = oemCode.match(/(\d{4,6})$/);
        if (!digitsMatch) {
            return { error: true, message: 'Código inválido', filterType: 'OIL', skuBuscado: oemCode, idReal: null };
        }
        
        const donaldsonCode = 'P55' + digitsMatch[1];
        console.log('🔍 [Donaldson] Código:', donaldsonCode);
        
        const productUrl = `https://shop.donaldson.com/store/es-us/product/${donaldsonCode}/80`;
        const { data: html } = await axios.get(productUrl);
        const $ = cheerio.load(html);
        
        const descripcion = $(".prodSubTitle").text().trim() || $(".product-name").first().text().trim();
        console.log('📝 [Donaldson] Descripción:', descripcion);
        
        if (!descripcion) {
            return { error: true, message: 'No encontrado', filterType: 'OIL', skuBuscado: oemCode, idReal: null };
        }
        
        const textoBusqueda = descripcion.toLowerCase();
        let filterType = 'OIL';
        
        if (textoBusqueda.includes('lubricante') || textoBusqueda.includes('lube') || textoBusqueda.includes('oil')) {
            filterType = 'OIL';
        } else if (textoBusqueda.includes('combustible') || textoBusqueda.includes('fuel')) {
            filterType = 'FUEL';
        } else if (textoBusqueda.includes('aire') || textoBusqueda.includes('air')) {
            filterType = 'AIR';
        }
        
        const specs = {};
        $(".spec-table tr").each((i, el) => {
            const label = $(el).find("td").eq(0).text().trim();
            const value = $(el).find("td").eq(1).text().trim();
            if (label && value) specs[label] = value;
        });
        
        const alternativos = [];
        $("div#crossReferencesList .cross-reference-number").each((i, el) => {
            const val = $(el).text().trim();
            if (val) alternativos.push(val);
        });
        
        const productosAlternativos = await getDonaldsonAlternatives(productUrl);
        
        return {
            filterType,
            skuBuscado: oemCode,
            idReal: donaldsonCode,
            descripcion,
            especificaciones: specs,
            alternativos,
            productosAlternativos,
            urlFinal: productUrl
        };
        
    } catch (error) {
        console.error("🔴 [Donaldson] ERROR:", error.message);
        return { error: true, message: error.message, filterType: 'OIL', skuBuscado: oemCode, idReal: null };
    }
};