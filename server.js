const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URL).then(() => console.log('🚀 v6.40: Universal Table Parser (Aggressive Mode)'));

const SCRAPE = async (url) => {
    const target = `https://api.scrapestack.com/scrape?access_key=${process.env.SCRAPESTACK_KEY}&url=${encodeURIComponent(url)}`;
    const res = await axios.get(target);
    return cheerio.load(res.data);
};

async function getDeepData(query, isKit) {
    const d = { specs: {}, components: [], machine: '', crossRefs: [], validated: false };
    try {
        const $ = await SCRAPE(`https://shop.donaldson.com/store/search?q=${query}`);
        const link = isKit ? $('.equipment-list-item a').first().attr('href') : $('.product-name a').first().attr('href');
        
        if (link) {
            const $d = await SCRAPE(`https://shop.donaldson.com${link}`);
            d.validated = true;
            
            // LÓGICA AGRESIVA: Escanea cada DIV y TD de la página
            $d('div, td, li, span').each((i, el) => {
                const text = $d(el).text().trim();
                const nextVal = $d(el).next().text().trim();

                if (text.includes('Outer Diameter')) d.specs.od = nextVal || text.split(':')[1];
                if (text.includes('Height') || text.includes('Length')) d.specs.height = nextVal || text.split(':')[1];
                if (text.includes('Thread Size')) d.specs.thread = nextVal || text.split(':')[1];
                if (text.includes('Efficiency')) d.specs.eff = nextVal || text.split(':')[1];
            });

            // Extraer Cross References o Componentes
            $d('.cross-reference-list li, .kit-components-table tr').each((i, el) => {
                const val = $d(el).text().trim();
                if (isKit) d.components.push(val); else d.crossRefs.push(val);
            });
            d.machine = $d('.equipment-header-title').text().trim();
        }
    } catch (e) { console.error("Scrape Error"); }
    return d;
}

app.get('/api/search/:code', async (req, res) => {
    const code = req.params.code.toUpperCase();
    const cat = req.query.cat || 'Oil';
    const isKit = cat.includes('Kits');
    
    try {
        const data = await getDeepData(code, isKit);
        if (!data.validated) return res.status(404).send("NOT_FOUND");
        
        // Sincronizar según categoría
        if (isKit) await syncKits(data, code); else await syncUnified(data, code, cat);
        
        res.json({ status: "SUCCESS", data });
    } catch (err) { res.status(500).send("SERVER_ERROR"); }
});

async function syncUnified(d, code, cat) {
    const auth = new JWT({ email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'];
    
    await sheet.addRow({
        'Input Code': code,
        'ELIMFILTERS SKU': `EF-${code.slice(-4)}`,
        'Thread Size': d.specs.thread || 'N/A',
        'Height (mm)': d.specs.height || 'N/A',
        'Outer Diameter (mm)': d.specs.od || 'N/A',
        'OEM Codes': code,
        'Cross Reference Codes': d.crossRefs.slice(0, 5).join(', ') || 'N/A',
        'Audit Status': 'V6.40_VERIFIED'
    });
}

// (La función syncKits se mantiene similar con la nueva data)
app.listen(process.env.PORT || 8080);
