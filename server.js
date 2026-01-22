const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URL).then(() => console.log('🚀 v5.30: Deep Scraper & Full Mapping Active'));

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
    const specs = {};
    const SCRAPE_URL = (url) => `https://api.scrapestack.com/scrape?access_key=${process.env.SCRAPESTACK_KEY}&url=${url}`;
    
    try {
        const response = await axios.get(SCRAPE_URL(`https://shop.donaldson.com/store/search?q=${code}`));
        const $ = cheerio.load(response.data);
        
        specs.duty = 'HD';
        specs.source = 'DONALDSON';
        
        // Extracción de datos de la tabla de Donaldson (Ejemplo de selectores)
        $('.attribute-row').each((i, el) => {
            const label = $(el).find('.label').text().trim();
            const value = $(el).find('.value').text().trim();
            
            if (label.includes('Outer Diameter')) specs.od = value;
            if (label.includes('Height') || label.includes('Length')) specs.height = value;
            if (label.includes('Thread Size')) specs.thread = value;
            if (label.includes('Efficiency')) specs.efficiency = value;
        });
    } catch (e) { 
        specs.duty = 'UNKNOWN';
        specs.source = 'OEM_PENDING';
    }
    return specs;
}

app.get('/api/search/:code', async (req, res) => {
    const code = req.params.code.toUpperCase();
    const cat = req.query.cat || 'Oil';
    try {
        const dna = await getTechnicalDNA(code);
        const config = TECH_MATRIX[cat] || { prefix: 'ELX', tech: 'STANDARD™' };
        const suffix = code.replace(/[^0-9]/g, '').slice(-4).padStart(4, '0');
        let sku = `${config.prefix}${suffix}`;
        
        if (cat === 'Turbines') {
            const letterMatch = code.match(/\d+([A-Z])/);
            if (letterMatch) sku += letterMatch[1];
        }

        const fullData = {
            originalCode: code,
            sku: sku,
            category: cat,
            tech: config.tech,
            prefix: config.prefix,
            ...dna
        };

        res.json({ source: 'V5.30_DEEP_SYNC', data: fullData });
        syncToSheets(fullData);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

async function syncToSheets(data) {
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
            'Input Code': data.originalCode,
            'ELIMFILTERS SKU': data.sku,
            'Description': `ELIMFILTERS ${data.category} - ${data.tech}`,
            'Filter Type': data.category,
            'Prefix': data.prefix,
            'ELIMFILTERS Technology': data.tech,
            'Duty': data.duty,
            'Thread Size': data.thread || 'TBD',
            'Height (mm)': data.height || 'TBD',
            'Outer Diameter (mm)': data.od || 'TBD',
            'Nominal Efficiency (%)': data.efficiency || 'TBD',
            'OEM Codes': data.originalCode,
            'Technical Sheet URL': `https://elimfilters.com/spec/${data.sku}`
        });
        console.log('✅ Sincronización completa de columnas');
    } catch (error) { console.error('❌ Error:', error); }
}

app.listen(process.env.PORT || 8080);
