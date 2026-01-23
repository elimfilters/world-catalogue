const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URL).then(() => console.log('🚀 v8.00: Victor Protocol Active (Manual Path)'));

const SCRAPE = async (url, actions) => {
    const target = `https://api.scrapestack.com/scrape?access_key=${process.env.SCRAPESTACK_KEY}&url=${encodeURIComponent(url)}&render_js=1&premium_proxy=1&actions=${encodeURIComponent(JSON.stringify(actions))}`;
    console.log(`📡 Ejecutando Protocolo en: ${url}`);
    const res = await axios.get(target);
    return cheerio.load(res.data);
};

app.get('/api/search/:code', async (req, res) => {
    const code = req.params.code.toUpperCase();
    const searchUrl = `https://shop.donaldson.com/store/es-us/search?Ntt=${code}*`;

    // LA RUTA QUE TÚ INDICASTE:
    const sequence = [
        // 1. En la lista de búsqueda, pulsar sobre el mosaico del producto (listTile)
        { "click": ".listTile a.donaldson-part-details" },
        { "wait": 2000 },
        // 2. Ya en la ficha, pulsar pestaña Atributos y Mostrar Más
        { "click": "a[data-target='.prodSpecInfoDiv']" },
        { "click": "#showMoreProductSpecsButton" },
        { "wait": 500 },
        // 3. Pulsar pestaña Productos Alternativos
        { "click": "a[data-target='.comapreProdListSection']" },
        { "wait": 500 },
        // 4. Pulsar pestaña Referencia Cruzada y Mostrar Más
        { "click": "a[data-target='.ListCrossReferenceDetailPageComp']" },
        { "click": "#showMorePdpListButton" },
        { "wait": 500 },
        // 5. Pulsar pestaña Productos del Equipo y Mostrar Más
        { "click": "a[data-target='.ListPartDetailPageComp']" },
        { "click": "#showMorePdpListButton" },
        { "wait": 1000 }
    ];

    try {
        const $ = await SCRAPE(searchUrl, sequence);
        
        const data = {
            code,
            description: $('.donaldson-product-details').first().text().trim(),
            specs: {
                thread: $('body').text().match(/Thread Size:\s*([^\n\r]*)/i)?.[1]?.trim(),
                od: $('body').text().match(/Outer Diameter:\s*([\d.]+)/i)?.[1]?.trim(),
                height: $('body').text().match(/Height:\s*([\d.]+)/i)?.[1]?.trim()
            },
            alternatives: [],
            crossRefs: [],
            equipment: []
        };

        // Extraer Alternativos (Sku diferentes)
        $('.comapreProdListSection .product-name').each((i, el) => data.alternatives.push($(el).text().trim()));

        // Extraer Referencias (Solo código, sin fabricante)
        $('.ListCrossReferenceDetailPageComp tr').each((i, el) => {
            const raw = $(el).find('td').first().text().trim();
            const cleanCode = raw.split(/\s+/)[0]; 
            if (cleanCode && cleanCode !== "Fabricante") data.crossRefs.push(cleanCode);
        });

        // Extraer Equipos
        $('.ListPartDetailPageComp .equipment-name').each((i, el) => data.equipment.push($(el).text().trim()));

        await syncToSheet(data);
        res.json({ status: "SUCCESS", data });

    } catch (err) {
        res.status(500).json({ error: "Falla en Protocolo Victor", detail: err.message });
    }
});

async function syncToSheet(d) {
    const auth = new JWT({ email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'];
    
    await sheet.addRow({
        'Input Code': d.code,
        'Description': d.description,
        'Thread Size': d.specs.thread || 'N/A',
        'Height (mm)': d.specs.height || 'N/A',
        'Outer Diameter (mm)': d.specs.od || 'N/A',
        'Alternative Products': d.alternatives.join(', '),
        'Cross Reference Codes': d.crossRefs.join(', '),
        'Equipment Applications': d.equipment.slice(0, 15).join('; '),
        'Audit Status': 'V8.00_VICTOR_PROTOCOL'
    });
}

app.listen(process.env.PORT || 8080);
