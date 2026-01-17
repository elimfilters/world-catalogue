const axios = require('axios');
const cheerio = require('cheerio');

async function simulacroDeep() {
    const searchUrl = 'https://shop.donaldson.com/store/es-us/search?Ntt=85106370';
    const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };

    try {
        console.log('1. Buscando link oficial...');
        const searchRes = await axios.get(searchUrl, { headers });
        const  = cheerio.load(searchRes.data);
        const relativeUrl = ('#product_url').val();
        const fullUrl = 'https://shop.donaldson.com' + relativeUrl;

        console.log('2. Extrayendo tabla de Referencia Cruzada expandida...');
        // Llamamos al fragmento que contiene TODA la tabla
        const crossRefRes = await axios.get(fullUrl + '/_crossReferenceTab', { headers });
        const  = cheerio.load(crossRefRes.data);

        let totalCodigos = 0;
        console.log('\n--- REPORTE DE EXTRACCIÓN ---');

        ('table tbody tr').each((i, row) => {
            const manufacturer = (row).find('td').eq(0).text().trim();
            const mainCode = (row).find('td').eq(1).text().trim();
            
            if (manufacturer && mainCode) {
                totalCodigos++;
                // Lógica para el símbolo "+": 
                // Buscamos si hay filas hermanas o datos ocultos en el mismo bloque
                const extraCodes = (row).find('.extra-codes-container span').length; // Ajuste según el HTML real
                
                if (extraCodes > 0) {
                    console.log('➕ Fabricante [' + manufacturer + '] tiene ' + extraCodes + ' códigos extra.');
                    totalCodigos += extraCodes;
                }
            }
        });

        console.log('\n✅ Simulación completada.');
        console.log('📊 Total de códigos detectados (principales + expandidos): ' + totalCodigos);
        
        if (totalCodigos > 0) {
            console.log('🚀 El scraper es capaz de ver la data jerárquica.');
        }

    } catch (e) { console.log('❌ Error:', e.message); }
}
simulacroDeep();
