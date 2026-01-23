const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const app = express();
app.use(express.json());

// 1. Esquema de Seguridad para MongoDB
const FilterSchema = new mongoose.Schema({
    code: String, sku: String, cat: String, specs: Object, status: String, createdAt: { type: Date, default: Date.now }
});
const Filter = mongoose.model('Filter', FilterSchema);

mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log('🚀 v6.50: Iron Scraper & DB Persistence Active'))
    .catch(err => console.error('❌ Error MongoDB:', err));

const SCRAPE = async (url) => {
    // Usamos render_js=1 para que Donaldson cargue las tablas de medidas
    const target = `https://api.scrapestack.com/scrape?access_key=${process.env.SCRAPESTACK_KEY}&url=${encodeURIComponent(url)}&render_js=1&premium_proxy=1`;
    const res = await axios.get(target);
    return cheerio.load(res.data);
};

app.get('/api/search/:code', async (req, res) => {
    const code = req.params.code.toUpperCase();
    const cat = req.query.cat || 'Oil';
    const sku = `EF-${code.slice(-4)}`;

    try {
        // PASO 1: Guardar intención en MongoDB (A prueba de fallos)
        const record = await Filter.findOneAndUpdate(
            { code }, 
            { code, sku, cat, status: 'SCRAPING_IN_PROGRESS' }, 
            { upsert: true, new: true }
        );
        console.log(`📝 Registro inicial creado en DB para: ${code}`);

        // PASO 2: Iniciar Scraper Agresivo
        const $ = await SCRAPE(`https://shop.donaldson.com/store/search?q=${code}`);
        const link = $('.product-name a').first().attr('href');
        
        let specs = {};
        if (link) {
            const $d = await SCRAPE(`https://shop.donaldson.com${link}`);
            // Captura de texto por patrones (Regex)
            const bodyText = $d('body').text();
            specs.thread = bodyText.match(/Thread Size:\s*([^\n\r]*)/i)?.[1]?.trim();
            specs.od = bodyText.match(/Outer Diameter:\s*([^\n\r]*)/i)?.[1]?.trim();
            specs.height = bodyText.match(/Height:\s*([^\n\r]*)/i)?.[1]?.trim();
            console.log(`✅ Datos extraídos: ${JSON.stringify(specs)}`);
        }

        // PASO 3: Actualizar DB con resultados
        record.specs = specs;
        record.status = specs.od ? 'COMPLETED' : 'SPECS_NOT_FOUND';
        await record.save();

        // PASO 4: Sincronizar a Google Sheets
        await syncToSheets(record);

        res.json({ status: "SUCCESS", data: record });
    } catch (err) { 
        console.error('❌ Error Crítico:', err.message);
        res.status(500).json({ error: err.message }); 
    }
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
        const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'];
        
        await sheet.addRow({
            'Input Code': d.code,
            'ELIMFILTERS SKU': d.sku,
            'Thread Size': d.specs?.thread || 'VERIFICAR',
            'Height (mm)': d.specs?.height || 'VERIFICAR',
            'Outer Diameter (mm)': d.specs?.od || 'VERIFICAR',
            'Audit Status': d.status
        });
        console.log('📊 Google Sheets Actualizado');
    } catch (e) { console.error('❌ Error Sheets:', e.message); }
}

app.listen(process.env.PORT || 8080);
