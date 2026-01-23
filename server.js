const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URL).then(() => console.log('🚀 v6.95: Smart Sequence Intelligence Active'));

const SCRAPE_SIMPLE = async (url) => {
    const target = `https://api.scrapestack.com/scrape?access_key=${process.env.SCRAPESTACK_KEY}&url=${encodeURIComponent(url)}&render_js=1`;
    const res = await axios.get(target);
    return cheerio.load(res.data);
};

const SCRAPE_WITH_ACTIONS = async (url) => {
    const actions = encodeURIComponent(JSON.stringify([
        { "click": "a[data-target='.prodSpecInfoDiv']" }, { "wait": 1000 },
        { "click": "#showMoreProductSpecsButton" }, { "wait": 500 },
        { "click": "a[data-target='.comapreProdListSection']" }, { "wait": 1000 },
        { "click": "a[data-target='.ListCrossReferenceDetailPageComp']" }, { "wait": 500 },
        { "click": "#showMorePdpListButton" }, { "wait": 1000 },
        { "click": "a[data-target='.ListPartDetailPageComp']" }, { "wait": 500 },
        { "click": "#showMorePdpListButton" }, { "wait": 1000 }
    ]));
    const target = `https://api.scrapestack.com/scrape?access_key=${process.env.SCRAPESTACK_KEY}&url=${encodeURIComponent(url)}&render_js=1&premium_proxy=1&actions=${actions}`;
    const res = await axios.get(target);
    return cheerio.load(res.data);
};

async function getFullData(query) {
    const d = { specs: {}, alts: [], crossRefs: [], equipment: [], validated: false };
    try {
        // FASE 1: Buscar el link (Sin clics)
        const $search = await SCRAPE_SIMPLE(`https://shop.donaldson.com/store/search?q=${query}`);
        const link = $search('.product-name a').first().attr('href') || $search('a[href*="/product/"]').first().attr('href');
        
        if (link) {
            const detailUrl = link.startsWith('http') ? link : `https://shop.donaldson.com${link}`;
            console.log(`🔗 Entrando a ficha técnica: ${detailUrl}`);

            // FASE 2: Entrar y ejecutar clics
            const $d = await SCRAPE_WITH_ACTIONS(detailUrl);
            d.validated = true;
            const text = $d('body').text();

            // Extracción de Atributos
            const getVal = (regex) => (text.match(regex) ? text.match(regex)[1].trim() : null);
            d.specs.thread = getVal(/Thread Size:\s*([^\n\r]*)/i);
            d.specs.od = getVal(/Outer Diameter:\s*([\d.]+)/i);
            d.specs.height = getVal(/Height:\s*([\d.]+)/i);
            d.specs.micron = getVal(/Efficiency[^:]*:\s*([^\n\r]*)/i);

            // Alternativos y Cruces (Limpios)
            $d('.comapreProdListSection .product-name').each((i, el) => d.alts.push($d(el).text().trim()));
            $d('.ListCrossReferenceDetailPageComp tr').each((i, el) => {
                const code = $d(el).find('td').first().text().trim().split(/\s+/)[0];
                if (code) d.crossRefs.push(code);
            });
            $d('.ListPartDetailPageComp .equipment-name').each((i, el) => d.equipment.push($d(el).text().trim()));
        }
    } catch (e) { console.error("Error en Smart Sequence:", e.message); }
    return d;
}

app.get('/api/search/:code', async (req, res) => {
    const code = req.params.code.toUpperCase();
    try {
        const data = await getFullData(code);
        if (!data.validated) return res.status(404).json({ error: "Product Not Found", step: "Search phase" });

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
        'Input Code': code, 'ELIMFILTERS SKU': `EF-${code.slice(-4)}`,
        'Thread Size': d.specs.thread || 'N/A',
        'Height (mm)': d.specs.height || 'N/A',
        'Outer Diameter (mm)': d.specs.od || 'N/A',
        'Micron Rating': d.specs.micron || 'N/A',
        'Cross Reference Codes': d.crossRefs.join(', '),
        'Alternative Products': d.alts.join(', '),
        'Equipment Applications': d.equipment.slice(0, 10).join('; '),
        'Audit Status': 'V6.95_SMART_SEQUENCE'
    });
}

app.listen(process.env.PORT || 8080);
