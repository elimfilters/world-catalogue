const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const app = express();
app.use(express.json());

// 1. RUTA DE VIDA (Para verificar que el servidor "está")
app.get('/', (req, res) => {
    res.send('<h1>🚀 ELIMFILTERS Engine V14.50 Online</h1><p>Servidor activo y listo para procesar la secuencia de Victor.</p>');
});

async function runVictorSequence(code) {
    console.log(`[V14.50] 🏁 Ejecutando secuencia manual para: ${code}`);
    const searchUrl = `https://shop.donaldson.com/store/es-us/search?Ntt=${code}*`;
    
    // SECUENCIA EXACTA DEFINIDA POR VÍCTOR
    const actions = [
        { "click": ".listTile a.donaldson-part-details" }, { "wait": 5000 },
        { "click": "a[data-target='.prodSpecInfoDiv']" }, { "click": "#showMoreProductSpecsButton" }, { "wait": 1500 },
        { "click": "a[data-target='.comapreProdListSection']" }, { "wait": 2500 },
        { "click": "a[data-target='.ListCrossReferenceDetailPageComp']" }, { "click": "#showMorePdpListButton" }, { "wait": 1500 },
        { "click": "a[data-target='.ListPartDetailPageComp']" }, { "click": "#showMorePdpListButton" }, { "wait": 2500 }
    ];

    const target = `https://api.scrapestack.com/scrape?access_key=${process.env.SCRAPESTACK_KEY}&url=${encodeURIComponent(searchUrl)}&render_js=1&premium_proxy=1&timeout=120000&actions=${encodeURIComponent(JSON.stringify(actions))}`;

    try {
        const res = await axios.get(target);
        const $ = cheerio.load(res.data);
        const bodyText = $('body').text();

        const data = {
            mainCode: code,
            description: $('.donaldson-product-details').first().text().trim() || "Filtro Donaldson",
            specs: {
                thread: bodyText.match(/Thread Size:\s*([^\n\r]*)/i)?.[1]?.trim(),
                od: bodyText.match(/Outer Diameter:\s*([\d.]+)/i)?.[1]?.trim(),
                height: bodyText.match(/Height:\s*([\d.]+)/i)?.[1]?.trim()
            },
            alternatives: [], 
            kits: [],
            crossRefs: [],
            equipment: []
        };

        // Lógica de Sub-Tabs de Alternativos
        $('.compareListProd').each((i, el) => {
            const altCode = $(el).find('h5').text().trim();
            const altDesc = $(el).find('.desLengthCheck').text().trim();
            if (altDesc.toLowerCase().includes('kit')) {
                data.kits.push({ code: altCode, desc: altDesc });
            } else if (altCode) {
                data.alternatives.push(altCode);
            }
        });

        // Cruces y Equipos
        $('.ListCrossReferenceDetailPageComp tr').each((i, el) => {
            const clean = $(el).find('td').first().text().trim().split(/\s+/)[0];
            if (clean && clean !== "Fabricante") data.crossRefs.push(clean);
        });
        $('.ListPartDetailPageComp .equipment-name').each((i, el) => data.equipment.push($(el).text().trim()));

        await syncToSheets(data);
        console.log(`✅ EXITO: ${code} guardado en Google Sheets.`);

    } catch (err) {
        console.error("❌ ERROR SCRAPING:", err.message);
    }
}

async function syncToSheets(d) {
    const auth = new JWT({ email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);
    await doc.loadInfo();

    // 1. MASTER_UNIFIED_V5
    const sheetF = doc.sheetsByTitle['MASTER_UNIFIED_V5'];
    await sheetF.addRow({
        'Input Code': d.mainCode,
        'Description': d.description,
        'Thread Size': d.specs.thread || 'N/A',
        'Alternative Products': d.alternatives.join(', '),
        'Cross Reference Codes': d.crossRefs.join(', '),
        'Equipment Applications': d.equipment.slice(0, 10).join('; '),
        'Audit Status': 'V14.50_SUCCESS'
    });

    // 2. MASTER_KITS_V1
    if (d.kits.length > 0) {
        const sheetK = doc.sheetsByTitle['MASTER_KITS_V1'];
        for (const k of d.kits) {
            await sheetK.addRow({
                'Kit SKU': `EK-${k.code.slice(-5)}`,
                'Original Code': k.code,
                'Description': k.desc,
                'Related Filter': d.mainCode
            });
        }
    }
}

app.get('/api/search/:code', (req, res) => {
    const code = req.params.code.toUpperCase();
    console.log(`📩 Recibida solicitud para: ${code}`);
    res.json({ status: "PROCESSING", message: "Víctor, la secuencia está en marcha. Revisa las hojas en 2 min." });
    runVictorSequence(code);
});

app.listen(process.env.PORT || 8080, () => {
    console.log(`🚀 Servidor V14.50 activo en puerto ${process.env.PORT || 8080}`);
});
