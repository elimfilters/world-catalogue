const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URL).then(() => console.log('✅ v5.10: Matriz Totalmente Integrada (ES9 Incluido)'));

// --- MATRIZ DE IDENTIDAD TÉCNICA GLOBAL ELIMFILTERS ---
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

const Filter = mongoose.model('FilterCache', new mongoose.Schema({
    originalCode: { type: String, unique: true },
    sku: String,
    duty: String,
    category: String,
    source: String,
    isOemFallback: Boolean,
    specs: mongoose.Schema.Types.Mixed
}));

async function getTechnicalDNA(code) {
    const SCRAPE_URL = (url) => `https://api.scrapestack.com/scrape?access_key=${process.env.SCRAPESTACK_KEY}&url=${url}`;
    try {
        const resHD = await axios.get(SCRAPE_URL(`https://shop.donaldson.com/store/search?q=${code}`));
        if (resHD.data && resHD.data.includes('Specifications')) return { duty: 'HD', source: 'DONALDSON', isOem: false };
    } catch (e) { console.log('Donaldson Skip'); }

    try {
        const resLD = await axios.get(SCRAPE_URL(`https://www.fram.com/search?q=${code}`));
        if (resLD.data && resLD.data.includes('Product Details')) return { duty: 'LD', source: 'FRAM', isOem: false };
    } catch (e) { console.log('FRAM Skip'); }

    return { duty: 'UNKNOWN', source: 'OEM_ORIGINAL', isOem: true };
}

app.get('/api/search/:code', async (req, res) => {
    const code = req.params.code.toUpperCase();
    const cat = req.query.cat || 'Oil';
    
    try {
        let filter = await Filter.findOne({ originalCode: code });
        if (filter) return res.json({ source: 'CACHE', data: filter });

                const dna = await getTechnicalDNA(code);
        const numbersOnly = code.replace(/[^0-9]/g, '');
        const suffix = numbersOnly.slice(-4).padStart(4, '0');
        const config = TECH_MATRIX[cat] || { prefix: 'ELX', tech: 'STANDARD™' };
        let sku = `${config.prefix}${suffix}`;

        // REGLA ESPECIAL TURBINAS: Capturar letra de micronaje (P, T, S)
        if (cat === 'Turbines') {
            const letterMatch = code.match(/\d+([A-Z])/);
            if (letterMatch) sku += letterMatch[1];
        }

        const newEntry = await Filter.create({
            originalCode: code, sku: sku, duty: dna.duty, category: cat,
            source: dna.source, isOemFallback: dna.isOem,
            specs: dna.isOem ? { alert: 'OEM ORIGIN: Validar medidas.' } : { status: 'Verified' }
        });

        res.json({ source: 'V5.10_TOTAL_UNIVERSE', data: newEntry });
        
        syncToSheets(newEntry);

    } catch (err) { res.status(500).json({ error: err.message }); }
});

async function syncToSheets(data) {
    try {
        const serviceAccountAuth = new JWT({
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];
        await sheet.addRow({
            SKU: data.sku,
            OriginalCode: data.originalCode,
            Duty: data.duty,
            Category: data.category,
            Source: data.source,
            IsOemFallback: data.isOemFallback,
            Timestamp: new Date().toISOString()
        });
        console.log('✅ Google Sheets Sync OK');
    } catch (error) {
        console.error('❌ Google Sheets Sync Error:', error);
    }
}

app.listen(process.env.PORT || 8080);

