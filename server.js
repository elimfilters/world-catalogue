const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URL).then(() => console.log('🚀 v5.20: Sistema de Columnas Maestro Activo'));

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

const Filter = mongoose.model('FilterCache', new mongoose.Schema({
    originalCode: String, sku: String, prefix: String, technology: String,
    duty: String, category: String, source: String
}));

app.get('/api/search/:code', async (req, res) => {
    const code = req.params.code.toUpperCase();
    const cat = req.query.cat || 'Oil';
    try {
        const config = TECH_MATRIX[cat] || { prefix: 'ELX', tech: 'STANDARD™' };
        const suffix = code.replace(/[^0-9]/g, '').slice(-4).padStart(4, '0');
        let sku = `${config.prefix}${suffix}`;
        if (cat === 'Turbines') {
            const letterMatch = code.match(/\d+([A-Z])/);
            if (letterMatch) sku += letterMatch[1];
        }

        const data = { originalCode: code, sku: sku, prefix: config.prefix, technology: config.tech, duty: 'PENDING_SCRAPE', category: cat };
        res.json({ source: 'V5.20_LIVE', data });
        
        syncToSheets(data);
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
        
        // Seleccionamos la pestaña específica que vi en tu imagen
        const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'] || doc.sheetsByIndex[0];

        await sheet.addRow({
            'Input Code': data.originalCode,
            'ELIMFILTERS SKU': data.sku,
            'Description': `Filtro ELIMFILTERS ${data.category}`,
            'Filter Type': data.category,
            'Prefix': data.prefix,
            'ELIMFILTERS Technology': data.technology,
            'Duty': data.duty,
            'OEM Codes': data.originalCode,
            'Technical Sheet URL': 'https://elimfilters.com/db'
        });
        console.log('✅ Fila agregada a MASTER_UNIFIED_V5');
    } catch (error) { console.error('❌ Error de Sync:', error); }
}

app.listen(process.env.PORT || 8080);
