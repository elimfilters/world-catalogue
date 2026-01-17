const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async function donaldsonScraperHTTP(oemCode) {
    try {
        console.log('🚀 [Donaldson Deep-Scan] Procesando:', oemCode);
        
        // 1. Construcción de la URL Directa
        const digitsMatch = oemCode.match(/(\d{4,6})$/);
        if (!digitsMatch) return { error: true, message: 'Código inválido' };
        
        const donaldsonCode = 'P55' + digitsMatch[1]; // O P52 según el caso, el servidor redirige
        const baseUrl = `https://shop.donaldson.com/store/es-us/product/${donaldsonCode}/80`;
        
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Referer': 'https://shop.donaldson.com/store/es-us/home'
        };

        // 2. Peticiones en paralelo para obtener todas las pestañas expandidas
        const [mainRes, crossRefRes, equipRes] = await Promise.allSettled([
            axios.get(baseUrl, { headers }),
            axios.get(`${baseUrl}/_crossReferenceTab`, { headers }),
            axios.get(`${baseUrl}/_equipmentTab`, { headers })
        ]);

        if (mainRes.status === 'rejected') throw new Error('Página principal no disponible');

        const $ = cheerio.load(mainRes.value.data);
        const descripcion = $('.prodSubTitle').text().trim() || $('.product-name').text().trim();

        if (!descripcion) return { error: true, message: 'Producto no encontrado en Donaldson' };

        // 3. Extracción de Atributos (Especificaciones)
        const especificaciones = {};
        $('.prodSpecInfoDiv table tr').each((i, row) => {
            const k = $(row).find('td').eq(0).text().trim().replace(':', '');
            const v = $(row).find('td').eq(1).text().trim();
            if (k && v) especificaciones[k] = v;
        });

        // 4. Extracción de Referencias Cruzadas (Incluyendo el símbolo "+")
        const productosAlternativos = [];
        if (crossRefRes.status === 'fulfilled') {
            const $cross = cheerio.load(crossRefRes.value.data);
            $cross('table tbody tr').each((i, row) => {
                const manufacturer = $cross(row).find('td').eq(0).text().trim();
                const partNum = $cross(row).find('td').eq(1).text().trim();
                
                if (manufacturer && partNum) {
                    // Agregamos el principal
                    productosAlternativos.push({ brand: manufacturer, part_number: partNum });
                    
                    // Lógica para el "+": Donaldson a veces pone sub-códigos en data-attributes o filas colapsadas
                    const dataContent = $cross(row).attr('data-content'); 
                    if (dataContent) {
                        const $sub = cheerio.load(dataContent);
                        $sub('li').each((j, li) => {
                            productosAlternativos.push({ 
                                brand: manufacturer, 
                                part_number: $sub(li).text().trim(),
                                type: 'SUB-CODE'
                            });
                        });
                    }
                }
            });
        }

        // 5. Extracción de Equipos
        const productosEquipo = [];
        if (equipRes.status === 'fulfilled') {
            const $equip = cheerio.load(equipRes.value.data);
            $equip('table tbody tr').each((i, row) => {
                const cells = $equip(row).find('td');
                if (cells.length >= 3) {
                    productosEquipo.push({
                        equipment: $equip(cells[0]).text().trim(),
                        engine: $equip(cells[1]).text().trim(),
                        model: $equip(cells[2]).text().trim()
                    });
                }
            });
        }

        return {
            error: false,
            skuBuscado: oemCode,
            idReal: donaldsonCode,
            filterType: 'AIR', // Por defecto para tu ejemplo de RadialSeal
            descripcion,
            especificaciones,
            productosAlternativos,
            productosEquipo,
            url: baseUrl,
            scrapedAt: new Date().toISOString()
        };

    } catch (error) {
        return { error: true, message: error.message };
    }
};
