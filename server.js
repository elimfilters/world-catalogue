const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URL).then(() => console.log('🚀 v6.80: Click & Expand Logic Active'));

const SCRAPE = async (url) => {
    // Definimos las acciones que descubriste en el DevTools
    const actions = encodeURIComponent(JSON.stringify([
        { "click": "a[data-target='.prodSpecInfoDiv']" },
        { "wait": 1000 },
        { "click": "#showMoreProductSpecsButton" },
        { "wait": 1000 }
    ]));

    // Enviamos las acciones a Scrapestack
    const target = `https://api.scrapestack.com/scrape?access_key=${process.env.SCRAPESTACK_KEY}&url=${encodeURIComponent(url)}&render_js=1&premium_proxy=1&actions=${actions}`;
    
    console.log(`🖱️ Interactuando con la página: ${url}`);
    const res = await axios.get(target);
    return cheerio.load(res.data);
};

async function getDeepData(query) {
    const d = { specs: {}, crossRefs: [], validated: false };
    try {
        const $search = await SCRAPE(`https://shop.donaldson.com/store/search?q=${query}`);
        const link = $search('a[href*="/product/"]').first().attr('href');
        
        if (link) {
            const detailUrl = link.startsWith('http') ? link : `https://shop.donaldson.com${link}`;
            const $d = await SCRAPE(detailUrl); // Aquí es donde se ejecutan los clics de Atributos y Mostrar Más
            d.validated = true;

            // Ahora que la tabla está expandida, leemos TODO el texto
            const bodyText = $d('body').text();
            
            const extract = (regex) => {
                const match = bodyText.match(regex);
                return match ? match[1].trim() : null;
            };

            d.specs.thread = extract(/Thread Size:\s*([^\n\r]*)/i);
            d.specs.od = extract(/Outer Diameter:\s*([\d.]+)\s*(?:mm|inch)/i);
            d.specs.height = extract(/Height:\s*([\d.]+)\s*(?:mm|inch)/i);
            d.specs.gasketOd = extract(/Gasket OD:\s*([\d.]+)\s*(?:mm|inch)/i);
            d.specs.gasketId = extract(/Gasket ID:\s*([\d.]+)\s*(?:mm|inch)/i);
            d.specs.micron = extract(/Efficiency[^:]*:\s*([^\n\r]*)/i);

            $d('.cross-reference-list li').each((i, el) => d.crossRefs.push($d(el).text().trim()));
        }
    } catch (e) { console.error("Error en interacción:", e.message); }
    return d;
}

app.get('/api/search/:code', async (req, res) => {
    const code = req.params.code.toUpperCase();
    try {
        const data = await getDeepData(code);
        if (!data.validated) return res.status(404).send("NOT_FOUND_AFTER_INTERACTION");

        await syncToSheet(data, code);
        res.json({ status: "SUCCESS", data });
    } catch (err) { res.status(500).send(err.message); }
});

async function syncToSheet(d, code) {
    const auth = new JWT({ email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'];

    await sheet.addRow({
        'Input Code': code,
        'ELIMFILTERS SKU': `EF-${code.slice(-4)}`,
        'Thread Size': d.specs.thread || 'N/A',
        'Height (mm)': d.specs.height || 'N/A',
        'Outer Diameter (mm)': d.specs.od || 'N/A',
        'Gasket OD (mm)': d.specs.gasketOd || 'N/A',
        'Micron Rating': d.specs.micron || 'N/A',
        'Cross Reference Codes': d.crossRefs.join(', '),
        'Audit Status': 'V6.80_INTERACTIVE_VALIDATED'
    });
}

app.listen(process.env.PORT || 8080);
