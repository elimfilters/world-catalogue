const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const app = express();
app.use(express.json());

async function runVictorProtocol(code) {
    console.log(`[V14.00] 🛠️ Iniciando extracción maestra para: ${code}`);
    const searchUrl = `https://shop.donaldson.com/store/es-us/search?Ntt=${code}*`;
    
    // LA SECUENCIA EXACTA DE VÍCTOR
    const actions = [
        { "click": ".listTile a.donaldson-part-details" }, { "wait": 5000 },
        { "click": "a[data-target='.prodSpecInfoDiv']" }, { "click": "#showMoreProductSpecsButton" }, { "wait": 1000 },
        { "click": "a[data-target='.comapreProdListSection']" }, { "wait": 2000 },
        { "click": "a[data-target='.ListCrossReferenceDetailPageComp']" }, { "click": "#showMorePdpListButton" }, { "wait": 1000 },
        { "click": "a[data-target='.ListPartDetailPageComp']" }, { "click": "#showMorePdpListButton" }, { "wait": 2000 }
    ];

    const target = `https://api.scrapestack.com/scrape?access_key=${process.env.SCRAPESTACK_KEY}&url=${encodeURIComponent(searchUrl)}&render_js=1&premium_proxy=1&timeout=120000&actions=${encodeURIComponent(JSON.stringify(actions))}`;

    try {
        const res = await axios.get(target);
        const $ = cheerio.load(res.data);
        const bodyText = $('body').text();

        // 1. DATA SKU PRINCIPAL
        const data = {
            mainCode: code,
            description: $('.donaldson-product-details').first().text().trim(),
            specs: {
                thread: bodyText.match(/Thread Size:\s*([^\n\r]*)/i)?.[1]?.trim(),
                od: bodyText.match(/Outer Diameter:\s*([\d.]+)/i)?.[1]?.trim(),
                height: bodyText.match(/Height:\s*([\d.]+)/i)?.[1]?.trim()
            },
            alternatives: [], // Para MASTER_UNIFIED_V5
            kits: [],         // Para MASTER_KITS_V1
            crossRefs: [],
            equipment: []
        };

        // 2. PROCESAR SUB-TABS (P551319, P559138, DBF5817)
        $('.compareListProd').each((i, el) => {
            const altCode = $(el).find('h5').text().trim();
            const altDesc = $(el).find('.desLengthCheck').text().trim();
            
            if (altDesc.toLowerCase().includes('kit')) {
                data.kits.push({ code: altCode, desc: altDesc });
            } else if (altCode) {
                data.alternatives.push(altCode);
            }
        });

        // 3. PROCESAR CRUCES Y EQUIPOS
        $('.ListCrossReferenceDetailPageComp tr').each((i, el) => {
            const clean = $(el).find('td').first().text().trim().split(/\s+/)[0];
            if (clean && clean !== "Fabricante") data.crossRefs.push(clean);
        });
        $('.ListPartDetailPageComp .equipment-name').each((i, el) => data.equipment.push($(el).text().trim()));

        await syncToGoogle(data);
        console.log(`✅ EXITO: ${code} y variantes procesadas.`);

    } catch (err) {
        console.error("❌ ERROR V14:", err.message);
    }
}

async function syncToGoogle(d) {
    const auth = new JWT({ email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);
    await doc.loadInfo();

    // ESCRIBIR EN MASTER_UNIFIED_V5
    const sheetFilters = doc.sheetsByTitle['MASTER_UNIFIED_V5'];
    await sheetFilters.addRow({
        'Input Code': d.mainCode,
        'Description': d.description,
        'Thread Size': d.specs.thread || 'N/A',
        'Alternative Products': d.alternatives.join(', '),
        'Cross Reference Codes': d.crossRefs.join(', '),
        'Equipment Applications': d.equipment.slice(0, 10).join('; '),
        'Audit Status': 'V14.00_MAIN_CERTIFIED'
    });

    // CREAR SKUS ALTERNATIVOS
    for (const alt of d.alternatives) {
        await sheetFilters.addRow({ 'Input Code': alt, 'Audit Status': `V14.00_ALT_FROM_${d.mainCode}` });
    }

    // ESCRIBIR EN MASTER_KITS_V1
    if (d.kits.length > 0) {
        const sheetKits = doc.sheetsByTitle['MASTER_KITS_V1'];
        for (const kit of d.kits) {
            await sheetKits.addRow({
                'Kit SKU': `EK-${kit.code.slice(-5)}`,
                'Original Code': kit.code,
                'Description': kit.desc,
                'Related Filter': d.mainCode
            });
        }
    }
}

app.get('/api/search/:code', (req, res) => {
    runVictorProtocol(req.params.code.toUpperCase());
    res.json({ status: "PROCESSING", message: "Víctor, el motor está ejecutando la matriz de 4 pestañas. Revisa las hojas en 90 segundos." });
});

app.listen(process.env.PORT || 8080);
