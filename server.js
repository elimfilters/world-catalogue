const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const app = express();
app.use(express.json());

app.get('/', (req, res) => res.send('<h1>🚀 V19.00 Shield - Online</h1>'));

async function runShieldProtocol(code) {
    console.log(`[V19.00] 🛡️ Iniciando protocolo blindado para: ${code}`);
    const searchUrl = `https://shop.donaldson.com/store/es-us/search?Ntt=${code}*`;
    
    const actions = [
        { "wait_for": ".listTile" },
        { "click": ".listTile a.donaldson-part-details" }, { "wait": 8000 },
        { "click": "a[data-target='.prodSpecInfoDiv']" }, { "wait": 2000 },
        { "click": "#showMoreProductSpecsButton" }, { "wait": 3000 }
    ];

    const target = `https://api.scrapestack.com/scrape?access_key=${process.env.SCRAPESTACK_KEY}&url=${encodeURIComponent(searchUrl)}&render_js=1&premium_proxy=1&proxy_type=residential&actions=${encodeURIComponent(JSON.stringify(actions))}`;

    try {
        const res = await axios.get(target);
        
        if (!res.data || res.data.length < 100) {
            throw new Error("Página recibida vacía o demasiado corta.");
        }

        const $ = cheerio.load(res.data);
        const htmlBody = $('body').html() || ""; // Evitamos el NULL

        const data = {
            mainCode: code,
            description: $('.donaldson-product-details h1').text().trim() || "Filtro no identificado",
            specs: {
                thread: htmlBody.match(/Thread Size<\/td>\s*<td>([^<]*)<\/td>/i)?.[1]?.trim() || "N/A",
                od: htmlBody.match(/Outer Diameter<\/td>\s*<td>([^<]*)<\/td>/i)?.[1]?.trim() || "N/A",
                height: htmlBody.match(/Height<\/td>\s*<td>([^<]*)<\/td>/i)?.[1]?.trim() || "N/A"
            }
        };

        console.log(`✅ Resultado: ${data.description} | Rosca: ${data.specs.thread}`);
        await syncToGoogle(data, "SUCCESS");

    } catch (err) {
        console.error("❌ ERROR CAPTURADO:", err.message);
        await syncToGoogle({ mainCode: code, description: "ERROR_CARGA", specs: {} }, `FALLO: ${err.message}`);
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
            'Description': d.description || "N/A",
            'Thread Size': d.specs?.thread || "N/A",
            'Audit Status': `V19_${status}`
        });
    } catch (e) { console.error("Error Sheet:", e.message); }
}

app.get('/api/search/:code', (req, res) => {
    runShieldProtocol(req.params.code.toUpperCase());
    res.json({ status: "SHIELD_ON", message: "Procesando con blindaje V19. Mira los logs." });
});

app.listen(process.env.PORT || 8080, () => console.log("🚀 V19.00 SHIELD ACTIVO"));
