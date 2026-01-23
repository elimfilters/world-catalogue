const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URL).then(() => console.log('🚀 v5.80: Full Spec Extractor (43 Columns) Active'));

const TECH_MATRIX = {
    'Air': { prefix: 'EA1', tech: 'MACROCORE™' },
    'Air Housings': { prefix: 'EA2', tech: 'AEROFLOW™' },
    'Oil': { prefix: 'EL8', tech: 'SYNTRAX™' },
    'Fuel': { prefix: 'EF9', tech: 'NANOFORCE™' },
    'Fuel Sep': { prefix: 'ES9', tech: 'AQUAGUARD™' },
    'Hydraulic': { prefix: 'EH6', tech: 'SYNTEPORE™' },
    'Cabin': { prefix: 'EC1', tech: 'MICROKAPPA™' },
    'Coolant': { prefix: 'EW7', tech: 'COOLTECH™' },
    'Kits HD': { prefix: 'EK5', tech: 'DURATECH™' },
    'Kits LD': { prefix: 'EK3', tech: 'DURATECH™' },
    'Turbines': { prefix: 'ET9', tech: 'AQUAGUARD™' },
    'Marine': { prefix: 'EM9', tech: 'MARINETECH™' },
    'Air Dryer': { prefix: 'ED4', tech: 'DRYGUARD™' }
};

async function getFullSpecs(code) {
    const s = { duty: 'UNKNOWN', crossRefs: [], apps: [] };
    const SCRAPE_URL = (target) => `https://api.scrapestack.com/scrape?access_key=${process.env.SCRAPESTACK_KEY}&url=${target}`;
    try {
        const searchRes = await axios.get(SCRAPE_URL(`https://shop.donaldson.com/store/search?q=${code}`));
        let $ = cheerio.load(searchRes.data);
        const productLink = $('.product-name a').attr('href') || $('.product-card a').attr('href');
        if (productLink) {
            const detailRes = await axios.get(SCRAPE_URL(`https://shop.donaldson.com${productLink}`));
            $ = cheerio.load(detailRes.data);
            s.duty = 'HD';
            $('.attribute-row').each((i, el) => {
                const label = $(el).find('.label').text().trim();
                const val = $(el).find('.value').text().trim();
                const n = parseFloat(val.replace(/[^0-9.]/g, ''));
                if (label.includes('Outer Diameter')) { s.od_mm = n; s.od_in = (n/25.4).toFixed(2); }
                if (label.includes('Height') || label.includes('Length')) { s.h_mm = n; s.h_in = (n/25.4).toFixed(2); }
                if (label.includes('Thread')) s.thread = val;
                if (label.includes('Gasket OD')) { s.god_mm = n; s.god_in = (n/25.4).toFixed(2); }
                if (label.includes('Gasket ID')) { s.gid_mm = n; s.gid_in = (n/25.4).toFixed(2); }
                if (label.includes('Efficiency')) s.eff = val;
                if (label.includes('Micron')) s.micron = val;
                if (label.includes('Media Type')) s.media = val;
            });
            $('.cross-reference-list li, .x-ref-row').each((i, el) => { s.crossRefs.push($(el).text().trim()); });
        }
    } catch (e) { console.error("Error specs: " + code); }
    return s;
}

app.get('/api/search/:code', async (req, res) => {
    const code = req.params.code.toUpperCase();
    const cat = req.query.cat || 'Oil';
    try {
        const specs = await getFullSpecs(code);
        const config = TECH_MATRIX[cat] || { prefix: 'ELX', tech: 'STANDARD™' };
        const suffix = code.replace(/[^0-9]/g, '').slice(-4).padStart(4, '0');
        let sku = `${config.prefix}${suffix}`;
        if (cat === 'Turbines') { const l = code.match(/\d+([A-Z])/); if (l) sku += l[1]; }
        const data = { code, sku, cat, tech: config.tech, prefix: config.prefix, ...specs };
        res.json({ source: 'V5.80_DEEP_DATA', data });
        syncToSheets(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

async function syncToSheets(d) {
    try {
        const auth = new JWT({ email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'];
        await sheet.addRow({
            'Input Code': d.code, 'ELIMFILTERS SKU': d.sku, 'Description': `ELIMFILTERS ${d.cat} - ${d.tech}`, 'Filter Type': d.cat,
            'Prefix': d.prefix, 'ELIMFILTERS Technology': d.tech, 'Duty': d.duty, 'Thread Size': d.thread || '',
            'Height (mm)': d.h_mm || '', 'Height (inch)': d.h_in || '', 'Outer Diameter (mm)': d.od_mm || '', 'Outer Diameter (inch)': d.od_in || '',
            'Gasket OD (mm)': d.god_mm || '', 'Gasket OD (inch)': d.god_in || '', 'Gasket ID (mm)': d.gid_mm || '', 'Gasket ID (inch)': d.gid_in || '',
            'Micron Rating': d.micron || '', 'Nominal Efficiency (%)': d.eff || '', 'Media Type': d.media || '',
            'Filtration Technology': d.tech, 'OEM Codes': d.code, 'Cross Reference Codes': d.crossRefs.join(', ') || '',
            'Technical Sheet URL': `https://elimfilters.com/spec/${d.sku}`
        });
    } catch (e) { console.error('Error Sync:', e); }
}
app.listen(process.env.PORT || 8080);
