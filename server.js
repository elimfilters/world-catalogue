const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
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
    'Fuel Sep':     { prefix: 'ES9', tech: 'AQUAGUARD™' },    // ES9: Separadores de Combustible
    'Hydraulic':    { prefix: 'EH6', tech: 'SYNTEPORE™' },
    'Cabin':        { prefix: 'EC1', tech: 'MICROKAPPA™' },
    'Coolant':      { prefix: 'EW7', tech: 'COOLTECH™' },
    'Kits HD':      { prefix: 'EK5', tech: 'DURATECH™' },
    'Kits LD':      { prefix: 'EK3', tech: 'DURATECH™' },
    'Turbinas':     { prefix: 'ET9', tech: 'TURBINAS SERIES™' },
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
    const SCRAPE_URL = (url) => https://api.scrapestack.com/scrape?access_key=&url=;
    try {
        const resHD = await axios.get(SCRAPE_URL(https://shop.donaldson.com/store/search?q=));
        if (resHD.data && resHD.data.includes('Specifications')) return { duty: 'HD', source: 'DONALDSON', isOem: false };
    } catch (e) { console.log('Donaldson Skip'); }

    try {
        const resLD = await axios.get(SCRAPE_URL(https://www.fram.com/search?q=));
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
        const suffix = code.replace(/[^0-9]/g, '').slice(-4).padStart(4, '0');
        const config = TECH_MATRIX[cat] || { prefix: 'ELX', tech: 'STANDARD™' };
        const sku = ${config.prefix};

        const newEntry = await Filter.create({
            originalCode: code, sku: sku, duty: dna.duty, category: cat,
            source: dna.source, isOemFallback: dna.isOem,
            specs: dna.isOem ? { alert: 'OEM ORIGIN: Validar medidas.' } : { status: 'Verified' }
        });

        res.json({ source: 'V5.10_TOTAL_UNIVERSE', data: newEntry });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(process.env.PORT || 8080);