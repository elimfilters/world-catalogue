const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const app = express();
app.use(express.json());

app.get('/', (req, res) => res.send('<h1>🚀 V23.00 Bloodhound - Online</h1><p>Donaldson no pudo con el Sniper, ahora va el Rastreador.</p>'));

async function runBloodhound(code) {
    console.log(`[V23.00] 🐕 Rastreando producto: ${code}`);
    
    // Volvemos al buscador que SÍ funciona
    const searchUrl = `https://shop.donaldson.com/store/es-us/search?Ntt=${code}*`;
    
    const actions = [
        { "wait_for": "a[href*='/product/']" }, // Espera a CUALQUIER enlace de producto
        { "click": "a[href*='/product/']:first" }, // Haz clic en el primerito que salga
        { "wait_for": ".prodSpecInfoDiv" }, 
        { "click": "a[data-target='.prodSpecInfoDiv']" }, { "wait": 2000 },
        { "click": "#showMoreProductSpecsButton" }, { "wait": 3000 }
    ];

    const target = `https://api.scrapestack.com/scrape?access_key=${process.env.SCRAPESTACK_KEY}&url=${encodeURIComponent(searchUrl)}&render_js=1&premium_proxy=1&proxy_type=residential&country_code=us&actions=${encodeURIComponent(JSON.stringify(actions))}`;

    try {
        const res = await axios.get(target);
        const $ = cheerio.load(res.data);
        const html = $('body').html() || "";

        // Si vemos el 404 de nuevo, lo registramos para insultarlos con pruebas
        if (html.includes("404") || html.includes("no encontramos la página")) {
            throw new Error("Donaldson lanzó un 404 en el buscador.");
        }

        const data = {
            mainCode: code,
            description: $('h1').first().text().trim() || "Filtro Encontrado",
            specs: {
                thread: html.match(/Thread Size<\/td>\s*<td>([^<]*)<\/td>/i)?.[1]?.trim() || "N/A",
                od: html.match(/Outer Diameter<\/td>\s*<td>([^<]*)<\/td>/i)?.[1]?.trim() || "N/A",
                height: html.match(/Height<\/td>\s*<td>([^<]*)<\/td>/i)?.[1]?.trim() || "N/A"
            }
        };

        console.log(`✅ ¡Lo tenemos! -> ${data.description} | Rosca: ${data.specs.thread}`);
        await syncToGoogle(data, "EXITO_V23");

    } catch (err) {
        console.error("❌ ERROR SUCIO:", err.message);
        await syncToGoogle({ mainCode: code, description: "DONALDSON_FALLO_WEB" }, `ERROR: ${err.message}`);
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
            'Audit Status': status
        });
    } catch (e) { console.error("Error Sheet:", e.message); }
}

app.get('/api/search/:code', (req, res) => {
    runBloodhound(req.params.code.toUpperCase());
    res.json({ status: "HUNTING", message: "V23: Rastreando el filtro. Esquivando sus 404 de porquería." });
});

app.listen(process.env.PORT || 8080, () => console.log("🚀 V23.00 BLOODHOUND ACTIVO"));
