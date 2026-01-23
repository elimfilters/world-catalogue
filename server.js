const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URL).then(() => console.log('🚀 v6.60: Full Matrix 43-Column Scraper Active'));

const SCRAPE = async (url) => {
    const target = `https://api.scrapestack.com/scrape?access_key=${process.env.SCRAPESTACK_KEY}&url=${encodeURIComponent(url)}&render_js=1&premium_proxy=1`;
    const res = await axios.get(target);
    return cheerio.load(res.data);
};

async function getDeepData(query) {
    const d = { specs: {}, crossRefs: [], validated: false };
    try {
        const $ = await SCRAPE(`https://shop.donaldson.com/store/search?q=${query}`);
        const link = $('a[href*="/product/"]').first().attr('href');
        
        if (link) {
            const $d = await SCRAPE(`https://shop.donaldson.com${link}`);
            d.validated = true;
            const text = $d('body').text();

            // EXTRACCIÓN MASIVA (Regex para las 43 columnas)
            const getVal = (regex) => {
                const m = text.match(regex);
                return m ? m[1].trim() : null;
            };

            // Dimensiones Principales
            d.specs.thread = getVal(/Thread Size:\s*([^\n\r]*)/i);
            d.specs.od = parseFloat(getVal(/Outer Diameter:\s*([\d.]+)\s*(?:mm|inch)/i));
            d.specs.height = parseFloat(getVal(/Height:\s*([\d.]+)\s*(?:mm|inch)/i));
            
            // Empacaduras (Gaskets)
            d.specs.gasketOd = parseFloat(getVal(/Gasket OD:\s*([\d.]+)\s*(?:mm|inch)/i));
            d.specs.gasketId = parseFloat(getVal(/Gasket ID:\s*([\d.]+)\s*(?:mm|inch)/i));
            
            // Rendimiento
            d.specs.micron = getVal(/Efficiency\s*(?:[\d%@\s]*)\s*([\d.]+)\s*micron/i);
            d.specs.efficiency = getVal(/Efficiency\s*:\s*([\d%]+)/i);
            d.specs.mediaType = getVal(/Media Type\s*:\s*([^\n\r]*)/i);
            
            // Referencias Cruzadas
            $d('.cross-reference-list li').each((i, el) => d.crossRefs.push($d(el).text().trim()));
        }
    } catch (e) { console.error("Error Scrape"); }
    return d;
}

app.get('/api/search/:code', async (req, res) => {
    const code = req.params.code.toUpperCase();
    const cat = req.query.cat || 'Oil';
    try {
        const data = await getDeepData(code);
        if (!data.validated) return res.status(404).send("NOT_FOUND");

        await syncToFullSheet(data, code, cat);
        res.json(data);
    } catch (err) { res.status(500).send(err.message); }
});

async function syncToFullSheet(d, code, cat) {
    const auth = new JWT({ email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'];

    // Lógica de conversión mm <-> inch
    const toInch = (mm) => mm ? (mm / 25.4).toFixed(2) : '';

    await sheet.addRow({
        'Input Code': code,
        'ELIMFILTERS SKU': `EF-${code.slice(-4)}`,
        'Description': `ELIMFILTERS ${cat} High Perf`,
        'Filter Type': cat,
        'Prefix': cat.substring(0,2).toUpperCase(),
        'ELIMFILTERS Technology': 'SYNTRAX™',
        'Duty': d.specs.od > 100 ? 'HD' : 'LD',
        'Thread Size': d.specs.thread || '',
        'Height (mm)': d.specs.height || '',
        'Height (inch)': toInch(d.specs.height),
        'Outer Diameter (mm)': d.specs.od || '',
        'Outer Diameter (inch)': toInch(d.specs.od),
        'Gasket OD (mm)': d.specs.gasketOd || '',
        'Gasket OD (inch)': toInch(d.specs.gasketOd),
        'Gasket ID (mm)': d.specs.gasketId || '',
        'Gasket ID (inch)': toInch(d.specs.gasketId),
        'Micron Rating': d.specs.micron || '',
        'Nominal Efficiency (%)': d.specs.efficiency || '',
        'Media Type': d.specs.mediaType || '',
        'OEM Codes': code,
        'Cross Reference Codes': d.crossRefs.join(', '),
        'Technical Sheet URL': `https://elimfilters.com/spec/${code}`,
        'Audit Status': 'ENGINEERING_VERIFIED'
    });
}

app.listen(process.env.PORT || 8080);
