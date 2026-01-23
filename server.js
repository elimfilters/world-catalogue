const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URL).then(() => console.log('🚀 v9.00: Master Intelligence Active (Matrix Protocol)'));

const SCRAPE = async (url, actions) => {
    // Timeout de 120 segundos para asegurar que Donaldson procese todos los clics de la matriz
    const target = `https://api.scrapestack.com/scrape?access_key=${process.env.SCRAPESTACK_KEY}&url=${encodeURIComponent(url)}&render_js=1&premium_proxy=1&timeout=120000&actions=${encodeURIComponent(JSON.stringify(actions))}`;
    const res = await axios.get(target);
    return cheerio.load(res.data);
};

app.get('/api/search/:code', async (req, res) => {
    const code = req.params.code.toUpperCase().trim();
    const searchUrl = `https://shop.donaldson.com/store/es-us/search?Ntt=${code}*`;

    // IMPLEMENTACIÓN DE LA MATRIZ DE VÍCTOR
    const actions = [
        { "click": ".listTile a.donaldson-part-details" }, { "wait": 4000 }, // Espera carga de ficha
        { "click": "a[data-target='.prodSpecInfoDiv']" }, { "wait": 1000 }, 
        { "click": "#showMoreProductSpecsButton" }, { "wait": 1000 },        // Pestaña 1
        { "click": "a[data-target='.comapreProdListSection']" }, { "wait": 1500 }, // Pestaña 2
        { "click": "a[data-target='.ListCrossReferenceDetailPageComp']" }, { "wait": 1000 },
        { "click": "#showMorePdpListButton" }, { "wait": 1500 },             // Pestaña 3
        { "click": "a[data-target='.ListPartDetailPageComp']" }, { "wait": 1000 },
        { "click": "#showMorePdpListButton" }, { "wait": 2000 }              // Pestaña 4
    ];

    try {
        const $ = await SCRAPE(searchUrl, actions);
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
            oemCodes: [],
            equipment: []
        };

        // Extracción según la matriz
        $('.comapreProdListSection .product-name').each((i, el) => data.alternatives.push($(el).text().trim()));
        
        $('.ListCrossReferenceDetailPageComp tr').each((i, el) => {
            const raw = $(el).find('td').first().text().trim().split(/\s+/)[0];
            if (raw && raw !== "Fabricante") {
                if (i < 4) data.oemCodes.push(raw); else data.crossRefs.push(raw);
            }
        });

        $('.ListPartDetailPageComp .equipment-name').each((i, el) => data.equipment.push($(el).text().trim()));

        await syncToSheet(data);
        res.json({ status: "SUCCESS", data });

    } catch (err) {
        res.status(500).json({ error: "Falla en Matriz V9.00", detail: err.message });
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
        'OEM Codes': d.oemCodes.join(', '),
        'Cross Reference Codes': d.crossRefs.join(', '),
        'Equipment Applications': d.equipment.slice(0, 15).join('; '),
        'Audit Status': 'V9.00_MATRIX_CERTIFIED'
    });
}

app.listen(process.env.PORT || 8080);
