const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URL).then(() => console.log('🚀 v7.00: Deep Navigator (Tile Logic) Active'));

// Función para encontrar el link en la página de resultados (Tile Logic)
const FIND_PRODUCT_LINK = async (query) => {
    const searchUrl = `https://shop.donaldson.com/store/es-us/search?Ntt=${query}*&Ntk=All`;
    const target = `https://api.scrapestack.com/scrape?access_key=${process.env.SCRAPESTACK_KEY}&url=${encodeURIComponent(searchUrl)}&render_js=1`;
    const res = await axios.get(target);
    const $ = cheerio.load(res.data);
    
    // Usamos el selector exacto que encontraste: a.donaldson-part-details o el input hidden product_url
    let link = $('a.donaldson-part-details').first().attr('href') || 
               $('input#product_url').first().val() ||
               $('.listTile a[href*="/product/"]').first().attr('href');
    
    return link ? (link.startsWith('http') ? link : `https://shop.donaldson.com${link}`) : null;
};

// Función para entrar al detalle y pulsar TODOS los botones que mencionaste
const SCRAPE_FULL_DETAILS = async (url) => {
    const actions = encodeURIComponent(JSON.stringify([
        { "click": "a[data-target='.prodSpecInfoDiv']" }, { "wait": 1000 }, // Atributos
        { "click": "#showMoreProductSpecsButton" }, { "wait": 500 },
        { "click": "a[data-target='.comapreProdListSection']" }, { "wait": 1000 }, // Alternativos
        { "click": "a[data-target='.ListCrossReferenceDetailPageComp']" }, { "wait": 500 }, // Cruces
        { "click": "#showMorePdpListButton" }, { "wait": 1000 },
        { "click": "a[data-target='.ListPartDetailPageComp']" }, { "wait": 500 }, // Equipos
        { "click": "#showMorePdpListButton" }, { "wait": 1000 }
    ]));
    
    const target = `https://api.scrapestack.com/scrape?access_key=${process.env.SCRAPESTACK_KEY}&url=${encodeURIComponent(url)}&render_js=1&premium_proxy=1&actions=${actions}`;
    const res = await axios.get(target);
    return cheerio.load(res.data);
};

app.get('/api/search/:code', async (req, res) => {
    const code = req.params.code.toUpperCase();
    try {
        console.log(`🔎 Iniciando Fase 1: Buscando Tile para ${code}`);
        const productLink = await FIND_PRODUCT_LINK(code);
        
        if (!productLink) {
            return res.status(404).json({ error: "Product Tile Not Found", step: "Search phase" });
        }

        console.log(`🔗 Fase 2: Entrando a Detalles: ${productLink}`);
        const $d = await SCRAPE_FULL_DETAILS(productLink);
        
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

        // Extraer Alternativos
        $d('.comapreProdListSection .product-name').each((i, el) => data.alternatives.push($d(el).text().trim()));
        
        // Extraer Cruces (Limpios)
        $d('.ListCrossReferenceDetailPageComp tr').each((i, el) => {
            const c = $d(el).find('td').first().text().trim().split(/\s+/)[0];
            if (c && c !== "Fabricante") data.crossRefs.push(c);
        });

        // Extraer Equipos
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
        'Alternative Products': d.alternatives.join(', '),
        'Cross Reference Codes': d.crossRefs.join(', '),
        'Equipment Applications': d.equipment.slice(0, 15).join('; '),
        'Audit Status': 'V7.00_DEEP_NAVIGATOR'
    });
}

app.listen(process.env.PORT || 8080);
