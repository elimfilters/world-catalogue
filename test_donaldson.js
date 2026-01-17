const axios = require('axios');
const cheerio = require('cheerio');

async function simulacro() {
    const searchUrl = 'https://shop.donaldson.com/store/es-us/search?Ntt=85106370';
    const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };

    try {
        // 1. PASO: BUSCAR EL PRODUCTO
        console.log('1. Accediendo al buscador...');
        const searchRes = await axios.get(searchUrl, { headers });
        const  = cheerio.load(searchRes.data);
        const relativeUrl = ('#product_url').val(); // Extrae el link del input hidden que me mostraste
        const fullUrl = 'https://shop.donaldson.com' + relativeUrl;
        console.log('✅ Producto encontrado:', fullUrl);

        // 2. PASO: ACCEDER A LA PÁGINA Y FORZAR DATA EXPANDIDA
        console.log('2. Extrayendo Tabs expandidos...');
        const [mainPage, crossRefs] = await Promise.all([
            axios.get(fullUrl, { headers }),
            axios.get(fullUrl + '/_crossReferenceTab', { headers }) // Simula el botón "Mostrar más"
        ]);

        const  = cheerio.load(mainPage.data);
        const  = cheerio.load(crossRefs.data);

        // Resultados
        console.log('\n--- RESULTADOS DEL SIMULACRO ---');
        console.log('📝 Descripción:', ('.prodSubTitle').text().trim());
        
        const refs = [];
        ('table tbody tr').each((i, el) => {
            refs.push((el).find('td').eq(1).text().trim());
        });

        console.log('📊 Total de Referencias Cruzadas encontradas:', refs.length);
        console.log('📋 Primeras 5:', refs.slice(0, 5).join(', '));
        
        if(refs.length > 5) {
            console.log('🚀 ¡ÉXITO! Se capturó la data expandida (más de 5 registros).');
        }
    } catch (e) { console.log('❌ Error:', e.message); }
}
simulacro();
