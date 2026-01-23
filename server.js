const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URL).then(() => console.log('🚀 v10.00: Non-Blocking Matrix Engine Active'));

// FUNCIÓN MAESTRA DE SCRAPING (Ejecuta tu matriz punto por punto)
async function executeVictorMatrix(code) {
    console.log(`🛠️ Iniciando Proceso de Fondo para: ${code}`);
    const searchUrl = `https://shop.donaldson.com/store/es-us/search?Ntt=${code}*`;
    
    // Matriz exacta de clics que tú definiste
    const actions = [
        { "click": ".listTile a.donaldson-part-details" }, { "wait": 5000 },
        { "click": "a[data-target='.prodSpecInfoDiv']" }, { "click": "#showMoreProductSpecsButton" }, { "wait": 1000 },
        { "click": "a[data-target='.comapreProdListSection']" }, { "wait": 2000 },
        { "click": "a[data-target='.ListCrossReferenceDetailPageComp']" }, { "click": "#showMorePdpListButton" }, { "wait": 1000 },
        { "click": "a[data-target='.ListPartDetailPageComp']" }, { "click": "#showMorePdpListButton" }, { "wait": 2000 }
    ];

    try {
        const target = `https://api.scrapestack.com/scrape?access_key=${process.env.SCRAPESTACK_KEY}&url=${encodeURIComponent(searchUrl)}&render_js=1&premium_proxy=1&timeout=120000&actions=${encodeURIComponent(JSON.stringify(actions))}`;
        const res = await axios.get(target);
        const $ = cheerio.load(res.data);
        const bodyText = $('body').text();

        const data = {
            code,
            description: $('.donaldson-product-details').first().text().trim(),
            specs: {
                thread: bodyText.match(/Thread Size:\s*([^\n\r]*)/i)?.[1]?.trim(),
                od: bodyText.match(/Outer Diameter:\s*([\d.]+)/i)?.[1]?.trim(),
                height: bodyText.match(/Height:\s*([\d.]+)/i)?.[1]?.trim()
            },
            alternatives: [],
            crossRefs: [],
            equipment: []
        };

        $('.comapreProdListSection .product-name').each((i, el) => data.alternatives.push($(el).text().trim()));
        $('.ListCrossReferenceDetailPageComp tr').each((i, el) => {
            const raw = $(el).find('td').first().text().trim().split(/\s+/)[0];
            if (raw && raw !== "Fabricante") data.crossRefs.push(raw);
        });
        $('.ListPartDetailPageComp .equipment-name').each((i, el) => data.equipment.push($(el).text().trim()));

        // Sincronizar al final
        await syncToSheet(data);
        console.log(`✅ Tarea completada con éxito para ${code}`);

    } catch (err) {
        console.error(`❌ Error en segundo plano para ${code}:`, err.message);
    }
}

app.get('/api/search/:code', (req, res) => {
    const code = req.params.code.toUpperCase().trim();
    
    // RESPUESTA INMEDIATA A JULES PARA QUE NO SE CUELGUE
    res.json({ 
        status: "PROCESSING", 
        message: `Víctor, he iniciado la extracción de ${code} siguiendo tu matriz. Los datos aparecerán en la Google Sheet en unos 90 segundos. No necesitas esperar aquí.` 
    });

    // EJECUCIÓN EN SEGUNDO PLANO
    executeVictorMatrix(code);
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
        'Audit Status': 'V10.00_ASYNC_SUCCESS'
    });
}

app.listen(process.env.PORT || 8080);
