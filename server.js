const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const app = express();
app.use(express.json());

app.get('/', (req, res) => res.send('<h1>🚀 V25.00 X-Ray - Online</h1>'));

async function runXRayProtocol(code) {
    console.log(`[V25.00] ☢️ Escaneando con Rayos X: ${code}`);
    const searchUrl = `https://shop.donaldson.com/store/es-us/search?Ntt=${code}*`;
    
    const actions = [
        { "wait_for": "a[href*='/product/']" },
        { "click": "a[href*='/product/']:first" },
        { "wait": 10000 }, // Espera agresiva de 10 segundos para que el JS cargue sí o sí
        { "click": "a[data-target='.prodSpecInfoDiv']" },
        { "click": "#showMoreProductSpecsButton" },
        { "wait": 2000 }
    ];

    // USAMOS "ULTRASTEALTH" (keep_headers + residential + desktop)
    const target = `https://api.scrapestack.com/scrape?access_key=${process.env.SCRAPESTACK_KEY}&url=${encodeURIComponent(searchUrl)}&render_js=1&premium_proxy=1&proxy_type=residential&keep_headers=1&device=desktop&actions=${encodeURIComponent(JSON.stringify(actions))}`;

    try {
        const res = await axios.get(target);
        const $ = cheerio.load(res.data);
        const html = $('body').html() || "";
        const text = $('body').text();

        // LOG DE DIAGNÓSTICO: ¿Vemos la palabra Thread en algún lado?
        console.log(`🔍 ¿Palabra 'Thread' presente?: ${text.includes("Thread")}`);

        // EXTRACCIÓN MULTI-ZONA
        const threadMatch = html.match(/Thread Size<\/td>\s*<td>([^<]*)<\/td>/i) || 
                            text.match(/Thread Size:\s*([^\n\r]*)/i) ||
                            text.match(/Tamaño de la rosca:\s*([^\n\r]*)/i);

        const data = {
            mainCode: code,
            description: $('h1').first().text().trim() || "BLOQUEO_VISUAL",
            specs: {
                thread: threadMatch ? threadMatch[1].trim() : "N/A",
                od: html.match(/Outer Diameter<\/td>\s*<td>([^<]*)<\/td>/i)?.[1]?.trim() || "N/A"
            }
        };

        console.log(`✅ Resultado: ${data.description} | Rosca: ${data.specs.thread}`);
        await syncToGoogle(data, text.includes("Thread") ? "XRAY_SUCCESS" : "XRAY_BLOCKED");

    } catch (err) {
        console.error("❌ FALLO X-RAY:", err.message);
        await syncToGoogle({ mainCode: code, description: "ERROR_V25" }, err.message);
    }
}

async function syncToGoogle(d, status) {
    try {
        const auth = new JWT({ email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'];
        await sheet.addRow({
            'Input Code': d.mainCode,
            'Description': d.description,
            'Thread Size': d.specs.thread || "N/A",
            'Audit Status': `V25_${status}_${new Date().toLocaleTimeString()}`
        });
    } catch (e) { console.error("Error Sheet:", e.message); }
}

app.get('/api/search/:code', (req, res) => {
    runXRayProtocol(req.params.code.toUpperCase());
    res.json({ status: "XRAY_STARTED", message: "Víctor, lanzando Rayos X con 10s de espera. No toques nada." });
});

app.listen(process.env.PORT || 8080);
