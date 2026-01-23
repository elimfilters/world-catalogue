const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URL).then(() => console.log('🚀 v6.20: Logic Certified - VIN/Equip vs Part Number'));

const TECH_MATRIX = {
    'Air': { prefix: 'EA1', tech: 'MACROCORE™' }, 'Oil': { prefix: 'EL8', tech: 'SYNTRAX™' },
    'Fuel': { prefix: 'EF9', tech: 'NANOFORCE™' }, 'Fuel Sep': { prefix: 'ES9', tech: 'AQUAGUARD™' },
    'Hydraulic': { prefix: 'EH6', tech: 'SYNTEPORE™' }, 'Kits HD': { prefix: 'EK5', tech: 'DURATECH™' },
    'Kits LD': { prefix: 'EK3', tech: 'DURATECH™' }, 'Turbines': { prefix: 'ET9', tech: 'AQUAGUARD™' }
};

const SCRAPE = async (url) => {
    const target = `https://api.scrapestack.com/scrape?access_key=${process.env.SCRAPESTACK_KEY}&url=${encodeURIComponent(url)}`;
    const res = await axios.get(target);
    return cheerio.load(res.data);
};

// RUTA A: FILTROS INDIVIDUALES (Busca Specs Técnicas)
async function getFilterDetails(partNumber) {
    const s = { specs: {}, crossRefs: [] };
    try {
        const $ = await SCRAPE(`https://shop.donaldson.com/store/search?q=${partNumber}`);
        const link = $('.product-name a').first().attr('href');
        if (link) {
            const $d = await SCRAPE(`https://shop.donaldson.com${link}`);
            $d('.attribute-row').each((i, el) => {
                const label = $d(el).find('.label').text().trim();
                const val = $d(el).find('.value').text().trim();
                const n = parseFloat(val.replace(/[^0-9.]/g, ''));
                if (label.includes('Outer Diameter')) { s.specs.od_mm = n; s.specs.od_in = (n/25.4).toFixed(2); }
                if (label.includes('Height')) { s.specs.h_mm = n; s.specs.h_in = (n/25.4).toFixed(2); }
                if (label.includes('Thread')) s.specs.thread = val;
                if (label.includes('Efficiency')) s.specs.eff = val;
            });
            $d('.cross-reference-list li').each((i, el) => s.crossRefs.push($d(el).text().trim()));
        }
    } catch (e) { console.error("Error Individual Filter"); }
    return s;
}

// RUTA B: KITS (Busca Componentes por VIN/Equipo)
async function getKitComponents(query) {
    const k = { components: [], machine: '' };
    try {
        const $ = await SCRAPE(`https://shop.donaldson.com/store/search?q=${query}`);
        const machineLink = $('.equipment-list-item a').first().attr('href');
        if (machineLink) {
            const $d = await SCRAPE(`https://shop.donaldson.com${machineLink}`);
            k.machine = $d('.equipment-header-title').text().trim();
            $d('.kit-components-table tr, .service-group-row').each((i, el) => {
                const p = $d(el).find('.part-number').text().trim();
                if (p) k.components.push(p);
            });
        }
    } catch (e) { console.error("Error Kit Scrape"); }
    return k;
}

app.get('/api/search/:code', async (req, res) => {
    const code = req.params.code.toUpperCase();
    const cat = req.query.cat || 'Oil';
    try {
        const config = TECH_MATRIX[cat] || { prefix: 'ELX', tech: 'STANDARD™' };
        const suffix = code.replace(/[^0-9]/g, '').slice(-4).padStart(4, '0');
        const sku = `${config.prefix}${suffix}`;

        if (cat.includes('Kits')) {
            const data = await getKitComponents(code);
            const final = { code, sku, cat, ...data };
            res.json(final);
            syncToKits(final);
        } else {
            const data = await getFilterDetails(code);
            const final = { code, sku, cat, tech: config.tech, prefix: config.prefix, ...data };
            res.json(final);
            syncToUnified(final);
        }
    } catch (err) { res.status(500).send(err.message); }
});

async function syncToUnified(d) {
    const auth = new JWT({ email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);
    await doc.loadInfo();
    await doc.sheetsByTitle['MASTER_UNIFIED_V5'].addRow({
        'Input Code': d.code, 'ELIMFILTERS SKU': d.sku, 'Prefix': d.prefix, 'ELIMFILTERS Technology': d.tech,
        'Thread Size': d.specs.thread || '', 'Height (mm)': d.specs.h_mm || '', 'Outer Diameter (mm)': d.specs.od_mm || '',
        'OEM Codes': d.code, 'Cross Reference Codes': d.crossRefs.join(', ') || ''
    });
}

async function syncToKits(d) {
    const auth = new JWT({ email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);
    await doc.loadInfo();
    await doc.sheetsByTitle['MASTER_KITS_V1'].addRow({
        'kit_sku': d.sku, 'kit_description_en': `Maintenance Kit for ${d.machine || d.code}`,
        'filters_included': d.components.join(', ') || 'N/A', 'equipment_applications': d.machine || d.code,
        'oem_kit_reference': d.code, 'audit_status': 'CERTIFIED_V6'
    });
}

app.listen(process.env.PORT || 8080);
