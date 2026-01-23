const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URL).then(() => console.log('🚀 v6.90: Full Intelligence Matrix (Alternatives/Cross/Equip) Active'));

const SCRAPE = async (url) => {
    // SECUENCIA MAESTRA DE CLICS (Según tu análisis)
    const actions = encodeURIComponent(JSON.stringify([
        { "click": "a[data-target='.prodSpecInfoDiv']" }, { "wait": 500 },
        { "click": "#showMoreProductSpecsButton" }, { "wait": 500 },
        { "click": "a[data-target='.comapreProdListSection']" }, { "wait": 800 }, // Alternativos
        { "click": "a[data-target='.ListCrossReferenceDetailPageComp']" }, { "wait": 500 },
        { "click": "#showMorePdpListButton" }, { "wait": 800 }, // Referencia Cruzada
        { "click": "a[data-target='.ListPartDetailPageComp']" }, { "wait": 500 },
        { "click": "#showMorePdpListButton" }, { "wait": 800 }  // Equipos
    ]));

    const target = `https://api.scrapestack.com/scrape?access_key=${process.env.SCRAPESTACK_KEY}&url=${encodeURIComponent(url)}&render_js=1&premium_proxy=1&actions=${actions}`;
    const res = await axios.get(target);
    return cheerio.load(res.data);
};

async function getFullIntelligence(query) {
    const d = { specs: {}, alts: [], crossRefs: [], oemCodes: [], equipment: [], validated: false };
    try {
        const $search = await SCRAPE(`https://shop.donaldson.com/store/search?q=${query}`);
        const link = $search('a[href*="/product/"]').first().attr('href');
        
        if (link) {
            const $d = await SCRAPE(link.startsWith('http') ? link : `https://shop.donaldson.com${link}`);
            d.validated = true;

            // 1. PRODUCTOS ALTERNATIVOS (Creación de variantes)
            $d('.comapreProdListSection .product-card').each((i, el) => {
                const altCode = $d(el).find('.product-name').text().trim();
                if (altCode) d.alts.push(altCode);
            });

            // 2. REFERENCIAS CRUZADAS (Limpieza de Fabricantes)
            $d('.ListCrossReferenceDetailPageComp tr').each((i, el) => {
                const rawText = $d(el).find('td').first().text().trim();
                const codeOnly = rawText.split(/\s+/)[0]; // Toma solo el primer bloque (el código)
                if (codeOnly) {
                    if (i < 3) d.oemCodes.push(codeOnly); // Los primeros suelen ser OEM
                    else d.crossRefs.push(codeOnly);
                }
            });

            // 3. PRODUCTOS DEL EQUIPO (Aplicaciones)
            $d('.ListPartDetailPageComp .equipment-name').each((i, el) => {
                d.equipment.push($d(el).text().trim());
            });

            // 4. ATRIBUTOS TÉCNICOS
            const bodyText = $d('body').text();
            d.specs.thread = bodyText.match(/Thread Size:\s*([^\n\r]*)/i)?.[1]?.trim();
            d.specs.od = bodyText.match(/Outer Diameter:\s*([\d.]+)/i)?.[1]?.trim();
            d.specs.height = bodyText.match(/Height:\s*([\d.]+)/i)?.[1]?.trim();
        }
    } catch (e) { console.error("Error Matrix:", e.message); }
    return d;
}

app.get('/api/search/:code', async (req, res) => {
    const code = req.params.code.toUpperCase();
    try {
        const data = await getFullIntelligence(code);
        if (!data.validated) return res.status(404).send("NOT_FOUND_IN_MATRIX");

        await syncToSheet(data, code);
        res.json({ status: "SUCCESS", data });
    } catch (err) { res.status(500).send(err.message); }
});

async function syncToSheet(d, code) {
    const auth = new JWT({ email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'];

    await sheet.addRow({
        'Input Code': code,
        'ELIMFILTERS SKU': `EF-${code.slice(-4)}`,
        'Thread Size': d.specs.thread || 'N/A',
        'OEM Codes': d.oemCodes.join(', '),
        'Cross Reference Codes': d.crossRefs.join(', '),
        'Alternative Products': d.alts.join(', '), // Columna para crear los otros 3 SKU
        'Equipment Applications': d.equipment.slice(0, 15).join('; '),
        'Audit Status': 'V6.90_FULL_INTELLIGENCE'
    });
}

app.listen(process.env.PORT || 8080);
