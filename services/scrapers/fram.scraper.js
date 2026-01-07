const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeFram(sku) {
    const cleanSku = sku.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const url = `https://www.fram.com/parts-search/${cleanSku}`;

    // CONFIGURACIÓN DE BLINDAJE: Headers de alta fidelidad y Timeouts
    const config = {
        headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache'
        },
        timeout: 15000 // 15 segundos para dar margen en redes lentas
    };

    try {
        const { data } = await axios.get(url, config);
        const $ = cheerio.load(data);

        // 1. Extracción de Atributos Técnicos
        const specs = {};
        $('.spec-table tr').each((i, el) => {
            const label = $(el).find('td').first().text().trim();
            const value = $(el).find('td').last().text().trim();
            if (label) specs[label] = value;
        });

        // 2. Lógica de Trilogía basada en Series
        const fullText = $('.product-info-wrapper').text().toLowerCase();
        let eff = "Standard", cap = "Standard", life = "Standard";

        if (fullText.includes('ultra synthetic')) {
            eff = "99%+ @ 20 Microns"; cap = "Maximum Capacity"; life = "20,000 Miles";
        } else if (fullText.includes('tough guard')) {
            eff = "99% Efficiency"; cap = "High Capacity"; life = "15,000 Miles";
        } else if (fullText.includes('extra guard')) {
            eff = "95% Efficiency"; cap = "Standard Capacity"; life = "10,000 Miles";
        }

        return {
            main_product: {
                PART_NUMBER_CLEAN: cleanSku,
                BRAND: "FRAM",
                OUTER_DIAMETER: specs['Outer Diameter'] || 'N/A',
                INNER_DIAMETER: specs['Inner Diameter'] || 'N/A',
                THREAD_SIZE: specs['Thread Size'] || 'N/A',
                HEIGHT: specs['Height'] || 'N/A',
                TRILOGY_EFFICIENCY: eff,
                TRILOGY_CAPACITY: cap,
                TRILOGY_LIFE: life,
                SOURCE: "PRODUCTION_BLINDADO_FRAM"
            }
        };
    } catch (error) {
        console.error(`[Fram Error] ${cleanSku}:`, error.message);
        return { error: "Error de red o SKU no existente en Fram", status: error.response?.status };
    }
}
module.exports = scrapeFram;
