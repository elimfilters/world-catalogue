const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URL).then(() => console.log('🚀 v7.10: Auto-Redirect & Tile Detection Active'));

const SCRAPE = async (url, actions = null) => {
    let target = `https://api.scrapestack.com/scrape?access_key=${process.env.SCRAPESTACK_KEY}&url=${encodeURIComponent(url)}&render_js=1&premium_proxy=1`;
    if (actions) target += `&actions=${encodeURIComponent(JSON.stringify(actions))}`;
    
    const res = await axios.get(target);
    return { $: cheerio.load(res.data), finalUrl: res.headers['x-final-url'] || url };
};

app.get('/api/search/:code', async (req, res) => {
    const code = req.params.code.toUpperCase().replace(/-/g, ''); // Quitamos guiones por si Jules los pone
    try {
        console.log(`🔎 Buscando: ${code}`);
        // FASE 1: Intento de búsqueda inicial
        const searchUrl = `https://shop.donaldson.com/store/es-us/search?Ntt=${code}`;
        const { $, finalUrl } = await SCRAPE(searchUrl);

        let productLink = null;

        // ¿Ya estamos en la página del producto? (Redirect exitoso)
        if (finalUrl.includes('/product/')) {
            console.log("⚡ Redirección directa detectada.");
            productLink = finalUrl;
        } else {
            // No hubo redirect, buscamos el Tile que Víctor identificó
            console.log("📋 Lista de resultados detectada. Buscando Tile...");
            const tileLink = $('a.donaldson-part-details').first().attr('href') || 
                             $('input#product_url').first().val();
            if (tileLink) productLink = `https://shop.donaldson.com${tileLink}`;
        }

        if (!productLink) {
            return res.status(404).json({ error: "Product Not Found", step: "Search/Redirect phase" });
        }

        // FASE 2: Expansión y Extracción (Tus 4 pestañas)
        console.log(`🛰️ Extrayendo matriz completa de: ${productLink}`);
        const actions = [
            { "click": "a[data-target='.prodSpecInfoDiv']" }, { "wait": 1000 },
            { "click": "#showMoreProductSpecsButton" }, { "wait": 500 },
            { "click": "a[data-target='.comapreProdListSection']" }, { "wait": 1000 },
            { "click": "a[data-target='.ListCrossReferenceDetailPageComp']" }, { "wait": 500 },
            { "click": "#showMorePdpListButton" }, { "wait": 1000 },
            { "click": "a[data-target='.ListPartDetailPageComp']" }, { "wait": 500 },
            { "click": "#showMorePdpListButton" }, { "wait": 1000 }
        ];

        const { $: $d } = await SCRAPE(productLink, actions);
        const text = $d('body').text();

        const data = {
            code,
            description: $d('.donaldson-product-details').first().text().trim(),
            specs: {
                thread: text.match(/Thread Size:\s*([^\n\r]*)/i)?.[1]?.trim(),
                od: text.match(/Outer Diameter:\s*([\d.]+)/i)?.[1]?.trim(),
                height: text.match(/Height:\s*([\d.]+)/i)?.[1]?.trim()
            },
            alternatives: [],
            crossRefs: [],
            equipment: []
        };

        $d('.comapreProdListSection .product-name').each((i, el) => data.alternatives.push($d(el).text().trim()));
        $d('.ListCrossReferenceDetailPageComp tr').each((i, el) => {
            const c = $d(el).find('td').first().text().trim().split(/\s+/)[0];
            if (c && c !== "Fabricante") data.crossRefs.push(c);
        });
        $d('.ListPartDetailPageComp .equipment-name').each((i, el) => data.equipment.push($d(el).text().trim()));

        await syncToSheet(data);
        res.json({ status: "SUCCESS", data });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

async function syncToSheet(d) {
    const auth = new JWT({ email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'];
    await sheet.addRow({
        'Input Code': d.code,
        'Description': d.description,
        'Thread Size': d.specs.thread || 'N/A',
        'Height (mm)': d.specs.height || 'N/A',
        'Outer Diameter (mm)': d.specs.od || 'N/A',
        'Cross Reference Codes': d.crossRefs.join(', '),
        'Equipment Applications': d.equipment.slice(0, 10).join('; '),
        'Audit Status': 'V7.10_AUTO_REDIRECT'
    });
}

app.listen(process.env.PORT || 8080);
