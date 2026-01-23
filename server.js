const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const app = express();
app.use(express.json());

async function runDebugProtocol(code) {
    console.log(`[V15.00] 🕵️ Investigando por qué Donaldson no entrega datos para: ${code}`);
    const searchUrl = `https://shop.donaldson.com/store/es-us/search?Ntt=${code}*`;
    
    // Matriz simplificada pero con esperas más largas (Paciencia extrema)
    const actions = [
        { "click": ".listTile a.donaldson-part-details" }, { "wait": 8000 },
        { "click": "a[data-target='.prodSpecInfoDiv']" }, { "wait": 2000 },
        { "click": "#showMoreProductSpecsButton" }, { "wait": 3000 }
    ];

    const target = `https://api.scrapestack.com/scrape?access_key=${process.env.SCRAPESTACK_KEY}&url=${encodeURIComponent(searchUrl)}&render_js=1&premium_proxy=1&timeout=120000&actions=${encodeURIComponent(JSON.stringify(actions))}`;

    try {
        const res = await axios.get(target);
        const $ = cheerio.load(res.data);
        const bodyText = $('body').text();
        
        // Diagnóstico: ¿Qué tan larga es la página que recibimos?
        console.log(`📏 Longitud del texto recibido: ${bodyText.length} caracteres.`);

        const data = {
            mainCode: code,
            description: $('.donaldson-product-details').first().text().trim() || "ERROR_LECTURA_TITULO",
            specs: {
                thread: bodyText.match(/Thread Size:\s*([^\n\r]*)/i)?.[1]?.trim(),
                od: bodyText.match(/Outer Diameter:\s*([\d.]+)/i)?.[1]?.trim(),
                height: bodyText.match(/Height:\s*([\d.]+)/i)?.[1]?.trim()
            }
        };

        // Si falló el Regex específico, intentamos capturar CUALQUIER número cerca de "Thread"
        if (!data.specs.thread) {
            data.specs.thread = bodyText.includes("Thread") ? "DETECTADO_PERO_NO_FILTRADO" : "NO_DETECTADO";
        }

        await syncToGoogle(data, bodyText.substring(0, 500)); // Enviamos los primeros 500 chars para ver qué ve el bot

    } catch (err) {
        console.error("❌ ERROR V15:", err.message);
    }
}

async function syncToGoogle(d, debugInfo) {
    const auth = new JWT({ email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'];

    await sheet.addRow({
        'Input Code': d.mainCode,
        'Description': d.description,
        'Thread Size': d.specs.thread || 'N/A',
        'Height (mm)': d.specs.height || 'N/A',
        'Outer Diameter (mm)': d.specs.od || 'N/A',
        'Audit Status': `V15_DEBUG: ${debugInfo.replace(/\n/g, ' ')}`
    });
}

app.get('/api/search/:code', (req, res) => {
    runDebugProtocol(req.params.code.toUpperCase());
    res.json({ status: "DEBUG_STARTED", message: "Víctor, estoy forzando una lectura profunda. Revisa la columna Audit Status en 2 min." });
});

app.listen(process.env.PORT || 8080);
