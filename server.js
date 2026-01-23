const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const app = express();
app.use(express.json());

// 1. RUTA DE VIDA INMEDIATA
app.get('/', (req, res) => res.send('<h1>🚀 V18.00 Diagnóstico - Online</h1><p>Si ves esto, el servidor arrancó. Ahora falta verificar las conexiones.</p>'));

async function runMasterProtocol(code) {
    console.log(`[V18.00] 🕵️ Iniciando secuencia para: ${code}`);
    const searchUrl = `https://shop.donaldson.com/store/es-us/search?Ntt=${code}*`;
    
    const actions = [
        { "click": ".listTile a.donaldson-part-details" }, { "wait": 6000 },
        { "click": "a[data-target='.prodSpecInfoDiv']" }, { "wait": 1500 },
        { "click": "#showMoreProductSpecsButton" }, { "wait": 2000 }
    ];

    const target = `https://api.scrapestack.com/scrape?access_key=${process.env.SCRAPESTACK_KEY}&url=${encodeURIComponent(searchUrl)}&render_js=1&premium_proxy=1&proxy_type=residential&keep_headers=1&actions=${encodeURIComponent(JSON.stringify(actions))}`;

    try {
        const res = await axios.get(target);
        const $ = cheerio.load(res.data);
        const html = $('body').html();

        const data = {
            mainCode: code,
            description: $('.donaldson-product-details h1').text().trim() || "Filtro Detectado",
            specs: {
                thread: html.match(/Thread Size<\/td>\s*<td>([^<]*)<\/td>/i)?.[1]?.trim(),
                od: html.match(/Outer Diameter<\/td>\s*<td>([^<]*)<\/td>/i)?.[1]?.trim(),
                height: html.match(/Height<\/td>\s*<td>([^<]*)<\/td>/i)?.[1]?.trim()
            }
        };

        console.log(`✅ Extracción exitosa: ${data.mainCode}`);
        await syncToGoogle(data);
    } catch (err) {
        console.error("❌ ERROR EN SCRAPING:", err.message);
    }
}

async function syncToGoogle(d) {
    try {
        console.log("📝 Intentando escribir en Google Sheets...");
        const auth = new JWT({ 
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, 
            key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), 
            scopes: ['https://www.googleapis.com/auth/spreadsheets'] 
        });
        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'];
        await sheet.addRow({
            'Input Code': d.mainCode,
            'Description': d.description,
            'Thread Size': d.specs.thread || 'N/A',
            'Audit Status': `V18_SUCCESS`
        });
        console.log("✅ Fila escrita correctamente.");
    } catch (e) {
        console.error("❌ ERROR GOOGLE SHEETS:", e.message);
    }
}

app.get('/api/search/:code', (req, res) => {
    runMasterProtocol(req.params.code.toUpperCase());
    res.json({ status: "OK", message: "Iniciado. Mira los logs de Railway para ver el progreso." });
});

// ARRANCAR EL SERVIDOR DE INMEDIATO (Sin esperar a DB)
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`\n*****************************************`);
    console.log(`🚀 SERVIDOR V18.00 ACTIVO EN PUERTO ${PORT}`);
    console.log(`*****************************************\n`);
});
