const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeDonaldson(sku) {
    const cleanSku = sku.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const url = `https://shop.donaldson.com/store/en-us/product/${cleanSku}`;

    try {
        const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(data);

        // 1. ESPECIFICACIONES TÉCNICAS (Prioridad para columnas Master V5)
        const specs = {};
        $('.product-attribute-list li').each((i, el) => {
            const label = $(el).find('.attr-label').text().trim().replace(':', '');
            const value = $(el).find('.attr-value').text().trim();
            specs[label] = value;
        });

        // 2. CORRECCIÓN: Captura de "Productos Alternativos" para la Trilogía
        // Donaldson agrupa los upgrades en secciones de 'alternative-products' o similares
        const upgrades = [];
        $('.alternative-products .product-card, .upgrade-options .product-info').each((i, el) => {
            upgrades.push($(el).text().trim());
        });
        
        const upgradeContext = upgrades.join(' ').toLowerCase();

        // Asignación lógica basada en la observación de productos alternativos
        let eff = "Standard";
        let cap = "Standard";
        let life = "Standard";

        if (upgradeContext.includes('blue') || upgradeContext.includes('nanofiber') || upgradeContext.includes('ultra-web')) {
            eff = "High Efficiency (Nanofiber)";
            cap = "High Capacity";
            life = "Extended Life";
        } else if (upgradeContext.includes('synthetic') || upgradeContext.includes('synteq')) {
            eff = "Premium Synthetic";
            cap = "Increased";
            life = "Double Life";
        }

        // 3. ESTRUCTURA FINAL PARA GOOGLE SHEET MASTER_UNIFIED_V5
        const main_product = {
            SKU_CLEAN: cleanSku,
            BRAND: "DONALDSON",
            // Columnas de dimensiones
            OUTER_DIAMETER: specs['Outer Diameter'] || specs['Diámetro exterior'] || '',
            INNER_DIAMETER: specs['Inner Diameter'] || specs['Diámetro interior'] || '',
            THREAD_SIZE: specs['Thread Size'] || specs['Tamaño de la rosca'] || '',
            LENGTH: specs['Length'] || specs['Longitud'] || '',
            
            // Columnas de la Trilogía (derivadas de Productos Alternativos)
            TRILOGY_EFFICIENCY: eff,
            TRILOGY_CAPACITY: cap,
            TRILOGY_LIFE: life,
            
            // Info adicional para el Master
            MEDIA_TYPE: specs['Media Type'] || "Cellulose",
            GASKET_OD: specs['Gasket OD'] || ''
        };

        return { main_product };
    } catch (error) {
        return { error: "Error de conexión o SKU no encontrado", sku: cleanSku };
    }
}

module.exports = scrapeDonaldson;
