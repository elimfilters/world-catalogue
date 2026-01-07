const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeDonaldson(sku) {
    const cleanSku = sku.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const url = `https://shop.donaldson.com/store/en-us/product/${cleanSku}`;

    // Configuración blindada: Timeouts y Headers de navegador real
    const config = {
        headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 10000 // 10 segundos antes de abortar
    };

    try {
        const { data } = await axios.get(url, config);
        const $ = cheerio.load(data);

        // Extracción técnica robusta
        const specs = {};
        $('.product-attribute-list li').each((i, el) => {
            const label = $(el).find('.attr-label').text().trim().replace(':', '');
            const value = $(el).find('.attr-value').text().trim();
            if (label) specs[label] = value;
        });

        // Captura blindada de Upgrades (Trilogía)
        const upgradeText = $('.alternative-products').text().toLowerCase() || "";
        
        let eff = "Standard", cap = "Standard", life = "Standard";
        if (upgradeText.includes('blue') || upgradeText.includes('ultra-web')) {
            eff = "High Efficiency (Nanofiber)"; cap = "High Capacity"; life = "Extended Life";
        }

        return {
            main_product: {
                SKU_CLEAN: cleanSku,
                BRAND: "DONALDSON",
                OUTER_DIAMETER: specs['Outer Diameter'] || specs['Diámetro exterior'] || 'N/A',
                THREAD_SIZE: specs['Thread Size'] || specs['Tamaño de la rosca'] || 'N/A',
                LENGTH: specs['Length'] || specs['Longitud'] || 'N/A',
                TRILOGY_EFFICIENCY: eff,
                TRILOGY_CAPACITY: cap,
                TRILOGY_LIFE: life,
                SOURCE: "PRODUCTION_BLINDADO"
            }
        };
    } catch (error) {
        console.error(`[Scraper Error] SKU ${cleanSku}:`, error.message);
        return { error: "SKU no encontrado o servidor bloqueado", status: error.response?.status };
    }
}
module.exports = scrapeDonaldson;
