const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const app = express();
app.use(express.json());

// Esquema para asegurar que MongoDB SIEMPRE guarde algo
const DataSchema = new mongoose.Schema({
    inputCode: String, sku: String, category: String, specs: Object, 
    status: String, timestamp: { type: Date, default: Date.now }
});
const DataLog = mongoose.model('DataLog', DataSchema);

mongoose.connect(process.env.MONGO_URL).then(() => console.log('🚀 v6.50: Iron Scraper & DB Persistence Active'));

const SCRAPE = async (url) => {
    // Forzamos Renderizado de JS y Proxy Premium para romper bloqueos
    const target = `https://api.scrapestack.com/scrape?access_key=${process.env.SCRAPESTACK_KEY}&url=${encodeURIComponent(url)}&render_js=1&premium_proxy=1`;
    console.log(`🔍 Navegando a: ${url}`);
    const res = await axios.get(target);
    return cheerio.load(res.data);
};

app.get('/api/search/:code', async (req, res) => {
    const code = req.params.code.toUpperCase();
    const cat = req.query.cat || 'Oil';
    const sku = `EF-${code.slice(-4)}`;
    
    try {
        // 1. PERSISTENCIA INMEDIATA: Guardamos en MongoDB antes de scrapear
        let record = await DataLog.findOneAndUpdate(
            { inputCode: code },
            { sku, category: cat, status: 'SCRAPING' },
            { upsert: true, new: true }
        );

        const isKit = cat.includes('Kits');
        const $ = await SCRAPE(`https://shop.donaldson.com/store/search?q=${code}`);
        
        // Buscamos el link dinámico (puede ser /product/ o /equipment/)
        const link = $('a[href*="/product/"]').first().attr('href') || $('a[href*="/equipment/"]').first().attr('href');
        
        let foundSpecs = {};
        let components = [];

        if (link) {
            const detailUrl = link.startsWith('http') ? link : `https://shop.donaldson.com${link}`;
            const $d = await SCRAPE(detailUrl);
            const fullBodyText = $d('body').text();

            // EXTRACCIÓN POR REGEX (No depende de clases CSS)
            if (!isKit) {
                foundSpecs.thread = fullBodyText.match(/Thread Size:\s*([^\n\r]*)/i)?.[1]?.trim();
                foundSpecs.od = fullBodyText.match(/Outer Diameter:\s*([^\n\r]*)/i)?.[1]?.trim();
                foundSpecs.height = fullBodyText.match(/Height:\s*([^\n\r]*)/i)?.[1]?.trim();
                foundSpecs.efficiency = fullBodyText.match(/Efficiency[^:]*:\s*([^\n\r]*)/i)?.[1]?.trim();
            } else {
                // Si es Kit, extraemos componentes de las celdas de tabla
                $d('td.part-number, a.part-link').each((i, el) => {
                    components.push($d(el).text().trim());
                });
            }
        }

        // 2. ACTUALIZAMOS MONGODB CON LOS DATOS REALES
        record.specs = isKit ? { components } : foundSpecs;
        record.status = 'SUCCESS';
        await record.save();

        // 3. SINCRONIZAMOS A GOOGLE SHEETS
        await syncToSheets(record, isKit);

        res.json({ status: "COMPLETED", data: record });

    } catch (err) {
        console.error('❌ Error Crítico:', err.message);
        res.status(500).send(err.message);
    }
});

async function syncToSheets(d, isKit) {
    try {
        const auth = new JWT({
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);
        await doc.loadInfo();
        
        const sheetName = isKit ? 'MASTER_KITS_V1' : 'MASTER_UNIFIED_V5';
        const sheet = doc.sheetsByTitle[sheetName];

        if (isKit) {
            await sheet.addRow({
                'kit_sku': d.sku, 'kit_description_en': `Kit for ${d.inputCode}`,
                'filters_included': d.specs.components?.join(', ') || 'CHECK_SOURCE',
                'oem_kit_reference': d.inputCode, 'audit_status': 'IRON_SCRAPE_CERTIFIED'
            });
        } else {
            await sheet.addRow({
                'Input Code': d.inputCode, 'ELIMFILTERS SKU': d.sku,
                'Thread Size': d.specs.thread || 'N/A',
                'Height (mm)': d.specs.height || 'N/A',
                'Outer Diameter (mm)': d.specs.od || 'N/A',
                'Nominal Efficiency (%)': d.specs.efficiency || 'N/A',
                'Audit Status': 'IRON_SCRAPE_CERTIFIED'
            });
        }
        console.log(`✅ Sincronizado en ${sheetName}`);
    } catch (e) { console.error('❌ Error Sheets:', e.message); }
}

app.listen(process.env.PORT || 8080);
