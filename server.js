const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URL).then(() => console.log('🚀 v5.40: Mapeo Total 43 Columnas Activo'));

const TECH_MATRIX = {
    'Air':          { prefix: 'EA1', tech: 'MACROCORE™' },
    'Air Housings': { prefix: 'EA2', tech: 'AEROFLOW™' },
    'Oil':          { prefix: 'EL8', tech: 'SYNTRAX™' },
    'Fuel':         { prefix: 'EF9', tech: 'NANOFORCE™' },
    'Fuel Sep':     { prefix: 'ES9', tech: 'AQUAGUARD™' },
    'Hydraulic':    { prefix: 'EH6', tech: 'SYNTEPORE™' },
    'Cabin':        { prefix: 'EC1', tech: 'MICROKAPPA™' },
    'Coolant':      { prefix: 'EW7', tech: 'COOLTECH™' },
    'Kits HD':      { prefix: 'EK5', tech: 'DURATECH™' },
    'Kits LD':      { prefix: 'EK3', tech: 'DURATECH™' },
    'Turbines':     { prefix: 'ET9', tech: 'AQUAGUARD™' },
    'Marine':       { prefix: 'EM9', tech: 'MARINETECH™' },
    'Air Dryer':    { prefix: 'ED4', tech: 'DRYGUARD™' }
};

async function getTechnicalDNA(code) {
    const s = {}; // technical specs
    try {
        const SCRAPE_URL = `https://api.scrapestack.com/scrape?access_key=${process.env.SCRAPESTACK_KEY}&url=https://shop.donaldson.com/store/search?q=${code}`;
        const res = await axios.get(SCRAPE_URL);
        const $ = cheerio.load(res.data);
        
        s.duty = 'HD';
        $('.attribute-row').each((i, el) => {
            const label = $(el).find('.label').text().trim();
            const val = $(el).find('.value').text().trim();
            const num = parseFloat(val.replace(/[^0-9.]/g, ''));

            if (label.includes('Outer Diameter')) { s.od_mm = num; s.od_in = (num/25.4).toFixed(2); }
            if (label.includes('Height') || label.includes('Length')) { s.h_mm = num; s.h_in = (num/25.4).toFixed(2); }
            if (label.includes('Thread Size')) s.thread = val;
            if (label.includes('Gasket OD')) { s.god_mm = num; s.god_in = (num/25.4).toFixed(2); }
            if (label.includes('Gasket ID')) { s.gid_mm = num; s.gid_in = (num/25.4).toFixed(2); }
            if (label.includes('Efficiency')) s.eff = val;
            if (label.includes('Micron')) s.micron = val;
            if (label.includes('Media Type')) s.media = val;
        });
    } catch (e) { s.duty = 'UNKNOWN'; }
    return s;
}

app.get('/api/search/:code', async (req, res) => {
    const code = req.params.code.toUpperCase();
    const cat = req.query.cat || 'Oil';
    try {
        const dna = await getTechnicalDNA(code);
        const config = TECH_MATRIX[cat] || { prefix: 'ELX', tech: 'STANDARD™' };
        const numbersOnly = code.replace(/[^0-9]/g, '');
        const suffix = numbersOnly.slice(-4).padStart(4, '0');
        let sku = `${config.prefix}${suffix}`;
        
        if (cat === 'Turbines') {
            const letterMatch = code.match(/\d+([A-Z])/);
            if (letterMatch) sku += letterMatch[1];
        }

        const data = { code, sku, cat, tech: config.tech, prefix: config.prefix, ...dna };
        res.json({ source: 'V5.40_FULL_CATALOG', data });
        syncToSheets(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

async function syncToSheets(d) {
    try {
        const auth = new JWT({
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'] || doc.sheetsByIndex[0];

        await sheet.addRow({
            'Input Code': d.code,
            'ELIMFILTERS SKU': d.sku,
            'Description': `ELIMFILTERS ${d.cat} High Performance`,
            'Filter Type': d.cat,
            'Subtype': '-',
            'Installation Type': '-',
            'Prefix': d.prefix,
            'ELIMFILTERS Technology': d.tech,
            'Duty': d.duty,
            'Thread Size': d.thread || '-',
            'Height (mm)': d.h_mm || '-',
            'Height (inch)': d.h_in || '-',
            'Outer Diameter (mm)': d.od_mm || '-',
            'Outer Diameter (inch)': d.od_in || '-',
            'Inner Diameter (mm)': '-',
            'Gasket OD (mm)': d.god_mm || '-',
            'Gasket OD (inch)': d.god_in || '-',
            'Gasket ID (mm)': d.gid_mm || '-',
            'Gasket ID (inch)': d.gid_in || '-',
            'ISO Test Method': '-',
            'Micron Rating': d.micron || '-',
            'Beta Ratio': '-',
            'Nominal Efficiency (%)': d.eff || '-',
            'Rated Flow (L/min)': '-',
            'Rated Flow (GPM)': '-',
            'Rated Flow (CFM)': '-',
            'Max Pressure (PSI)': '-',
            'Burst Pressure (PSI)': '-',
            'Collapse Pressure (PSI)': '-',
            'Bypass Valve Pressure (PSI)': '-',
            'Pressure Valve': '-',
            'Media Type': d.media || '-',
            'Anti-Drainback Valve': '-',
            'Filtration Technology': d.tech,
            'Special Features': 'Heavy Duty Design',
            'OEM Codes': d.code,
            'Cross Reference Codes': '-',
            'Equipment Applications': '-',
            'Engine Applications': '-',
            'Equipment Year': '-',
            'Qty Required': '1',
            'Technical Sheet URL': `https://elimfilters.com/spec/${d.sku}`
        });
        console.log('✅ 43 Columnas sincronizadas exitosamente');
    } catch (e) { console.error('❌ Error de Sheet:', e); }
}

app.listen(process.env.PORT || 8080);
