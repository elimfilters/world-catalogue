const axios = require('axios');
const cheerio = require('cheerio');

async function simulacroDeep() {
    const searchUrl = 'https://shop.donaldson.com/store/es-us/search?Ntt=' + '85106370';
    const headers = { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'es-US,es;q=0.9'
    };

    try {
        console.log('1. Buscando en: ' + searchUrl);
        const searchRes = await axios.get(searchUrl, { headers });
        const $search = cheerio.load(searchRes.data);
        
        // Obtenemos la URL del producto desde el input hidden que mencionaste
        const relativeUrl = $search('#product_url').val();
        if (!relativeUrl) {
            console.log('❌ No se encontró el input #product_url. Verificando tiles...');
            const firstTile = $search('.donaldson-part-details').first().attr('href');
            if (!firstTile) throw new Error('No se encontró el producto en los resultados.');
            var fullUrl = 'https://shop.donaldson.com' + firstTile;
        } else {
            var fullUrl = 'https://shop.donaldson.com' + relativeUrl;
        }

        console.log('✅ URL Oficial: ' + fullUrl);

        console.log('2. Accediendo a pestañas expandidas...');
        // El endpoint /_crossReferenceTab devuelve el HTML de la tabla COMPLETA
        const crossRefRes = await axios.get(fullUrl + '/_crossReferenceTab', { headers });
        const $cross = cheerio.load(crossRefRes.data);

        let totalRefs = 0;
        let fabricantesConPlus = 0;

        $cross('table tbody tr').each((i, row) => {
            const manufacturer = $cross(row).find('td').eq(0).text().trim();
            const partNum = $cross(row).find('td').eq(1).text().trim();
            
            if (manufacturer && partNum) {
                totalRefs++;
                // Detectar si la fila tiene el símbolo "+" (clase expandable o similar)
                const hasPlus = $cross(row).find('.fa-plus, .expandable').length > 0;
                
                // Si hay sub-filas (códigos ocultos), Donaldson suele enviarlas en tr subsiguientes
                // o en bloques colapsables. Los contamos aquí:
                const subCodes = $cross(row).next('.collapse, .child-row').find('td').length;
                
                if (hasPlus || subCodes > 0) {
                    fabricantesConPlus++;
                    // Si el HTML trae los sub-códigos directamente:
                    totalRefs += (subCodes > 0 ? subCodes : 1); 
                }
            }
        });

        console.log('\n--- REPORTE FINAL ---');
        console.log('📝 Descripción: ' + $search('.donaldson-product-details').first().text().trim());
        console.log('📊 Referencias Totales: ' + totalRefs);
        console.log('➕ Fabricantes con códigos múltiples (+): ' + fabricantesConPlus);
        
        if (totalRefs > 10) {
            console.log('\n🚀 ÉXITO: Se ha capturado la lista larga. El método HTTP es válido.');
        }

    } catch (e) { 
        console.log('❌ Error en el simulacro: ' + e.message);
        if(e.response) console.log('Status:', e.response.status);
    }
}
simulacroDeep();
