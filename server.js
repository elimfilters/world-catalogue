const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URL).then(() => console.log('🚀 v5.60: Router Dual MASTER_UNIFIED / MASTER_KITS Activo'));

const TECH_MATRIX = {
    'Air':          { prefix: 'EA1', tech: 'MACROCORE™' },
    'Air Housings': { prefix: 'EA2', tech: 'AEROFLOW™' },
    'Oil':          { prefix: 'EL8', tech: 'SYNTRAX™' },
    'Fuel':         { prefix: 'EF9', tech: 'NANOFORCE™' },
    'Fuel Sep':     { prefix: 'ES9', tech: 'AQUAGUARD™' },
    'Hydraulic':    { prefix: 'EH6', tech: 'SYNTEPORE™' },
    'Cabin':        { prefix: 'EC1', tech: 'MICROKAPPA™' },
    'Cool coolant': { prefix: 'EW7', tech: 'COOLTECH™' },
    'Kits HD':      { prefix: 'EK5', tech: 'DURATECH™' },
    'Kits LD':      { prefix: 'EK3', tech: 'DURATECH™' },
    'Turbines':     { prefix: 'ET9', tech: 'AQUAGUARD™' },
    'Marine':       { prefix: 'EM9', tech: 'MARINETECH™' },
    'Air Dryer':    { prefix: 'ED4', tech: 'DRYGUARD™' }
};

async function getTechnicalDNA(code) {
    const s = { duty: 'UNKNOWN' };
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
            if (label.includes('Micron')) s.micron = val;
        });
    } catch (e) {}
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
        res.json({ source: 'V5.60_DUAL_ROUTING', data });

        if (cat.includes('Kits')) {
            syncToMasterKits(data);
        } else {
            syncToMasterUnified(data);
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

async function syncToMasterUnified(d) {
    try {
        const auth = new JWT({ email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'];
        await sheet.addRow({
            'Input Code': d.code, 'ELIMFILTERS SKU': d.sku, 'Description': `Filtro ${d.cat}`, 'Filter Type': d.cat,
            'Prefix': d.prefix, 'ELIMFILTERS Technology': d.tech, 'Duty': d.duty, 'Thread Size': d.thread || '-',
            'Height (mm)': d.h_mm || '-', 'Height (inch)': d.h_in || '-', 'Outer Diameter (mm)': d.od_mm || '-', 'Outer Diameter (inch)': d.od_in || '-',
            'Micron Rating': d.micron || '-', 'Filtration Technology': d.tech, 'OEM Codes': d.code, 'Qty Required': '1'
        });
    } catch (e) { console.error('Error Unified:', e); }
}

async function syncToMasterKits(d) {
    try {
        const auth = new JWT({ email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['MASTER_KITS_V1'];
        await sheet.addRow({
            'kit_sku': d.sku, 'kit_type': d.cat, 'kit_series': d.tech, 'kit_description_en': `ELIMFILTERS Kit for ${d.code}`,
            'filters_included': 'Multi-filter set', 'equipment_applications': 'TBD', 'engine_applications': 'TBD',
            'industry_segment': 'Industrial/Transport', 'warranty_months': '12', 'change_interval_km': '15000',
            'change_interval_hours': '250', 'norm': 'ISO 9001', 'sku_base': d.sku, 'oem_kit_reference': d.code,
            'product_image_url': 'https://elimfilters.com/kit-img.jpg', 'url_technical_sheet_pdf': 'https://elimfilters.com/pdf',
            'stock_status': 'Available', 'audit_status': 'Verified', 'created_at': new Date().toISOString(), 'created_by': 'ELIM_SYSTEM'
        });
    } catch (e) { console.error('Error Kits:', e); }
}

app.listen(process.env.PORT || 8080);
