const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const app = express();
app.use(express.json());

app.get('/', (req, res) => res.send('<h1>🚀 V21.00 Human Mirror - Online</h1>'));

async function runMirrorProtocol(code) {
    console.log(`[V21.00] 👤 Imitando navegación humana para: ${code}`);
    const searchUrl = `https://shop.donaldson.com/store/es-us/search?Ntt=${code}*`;
    
    const actions = [
        { "wait_for": ".listTile" },
        { "click": ".listTile a.donaldson-part-details" },
        { "wait": 5000 }, // Espera a que cargue la ficha
        { "click": "a[data-target='.prodSpecInfoDiv']" },
        { "wait": 2000 },
        { "click": "#showMoreProductSpecsButton" },
        { "wait": 3000 }
    ];

    const target = `https://api.scrapestack.com/scrape?access_key=${process.env.SCRAPESTACK_KEY}&url=${encodeURIComponent(searchUrl)}&render_js=1&premium_proxy=1&proxy_type=residential&keep_headers=1&wait_until=networkidle0&actions=${encodeURIComponent(JSON.stringify(actions))}`;

    try {
        const res = await axios.get(target);
        const $ = cheerio.load(res.data);
        const fullText = $('body').text();
        const html = $('body').html() || "";

        // Extracción agresiva: buscamos en todo el texto, no solo en tablas
        const data = {
            mainCode: code,
            description: $('h1').first().text().trim() || "Filtro Detectado (Sin Título)",
            specs: {
                thread: fullText.match(/Thread Size[:\s]+([^\n\r<]*)/i)?.[1]?.trim(),
                od: fullText.match(/Outer Diameter[:\s]+([\d.]+)/i)?.[1]?.trim(),
                height: fullText.match(/Height[:\s]+([\d.]+)/i)?.[1]?.trim()
            }
        };

        console.log(`✅ Captura: ${data.description} | Rosca: ${data.specs.thread}`);
        await syncToGoogle(data, fullText.includes("Thread") ? "DATA_FOUND" : "TEXT_ONLY");

    } catch (err) {
        console.error("❌ Fallo en V21:", err.message);
        await syncToGoogle({ mainCode: code, description: "ERROR_CARGA" }, "TIMEOUT_OR_BLOCK");
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
            'Thread Size': d.specs?.thread || "N/A",
            'Audit Status': `V21_${status}_${new Date().toLocaleTimeString()}`
        });
    } catch (e) { console.error("Error Sheet:", e.message); }
}

app.get('/api/search/:code', (req, res) => {
    runMirrorProtocol(req.params.code.toUpperCase());
    res.json({ status: "MIRROR_ON", message: "V21 en marcha. Emulando red humana." });
});

app.listen(process.env.PORT || 8080, () => console.log("🚀 V21.00 MIRROR ACTIVO"));
