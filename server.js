const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const app = express();
app.use(express.json());

app.get('/', (req, res) => res.send('<h1>🚀 V17.00 Chrome Mirror - Online</h1>'));

async function runChromeMirror(code) {
    console.log(`[V17.00] 🕵️ Espejeando identidad de Chrome para: ${code}`);
    const searchUrl = `https://shop.donaldson.com/store/es-us/search?Ntt=${code}*`;
    
    // LA SECUENCIA DE CLICS QUE TÚ INDICASTE
    const actions = [
        { "click": ".listTile a.donaldson-part-details" }, { "wait": 6000 },
        { "click": "a[data-target='.prodSpecInfoDiv']" }, { "wait": 1500 },
        { "click": "#showMoreProductSpecsButton" }, { "wait": 2000 },
        { "click": "a[data-target='.comapreProdListSection']" }, { "wait": 2000 }, // Sub-tabs de Alternativos
        { "click": "a[data-target='.ListCrossReferenceDetailPageComp']" }, { "wait": 1000 },
        { "click": "#showMorePdpListButton" }, { "wait": 1500 }
    ];

    // CONFIGURACIÓN DE IDENTIDAD HUMANA (Stealth Mode)
    const target = `https://api.scrapestack.com/scrape?access_key=${process.env.SCRAPESTACK_KEY}&url=${encodeURIComponent(searchUrl)}&render_js=1&premium_proxy=1&proxy_type=residential&device=desktop&keep_headers=1&actions=${encodeURIComponent(JSON.stringify(actions))}`;

    try {
        const res = await axios.get(target, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
            }
        });

        const $ = cheerio.load(res.data);
        const bodyText = $('body').text();
        const html = $('body').html();

        const data = {
            mainCode: code,
            description: $('.donaldson-product-details h1').text().trim() || "Filtro Especial HD",
            specs: {
                thread: html.match(/Thread Size<\/td>\s*<td>([^<]*)<\/td>/i)?.[1]?.trim(),
                od: html.match(/Outer Diameter<\/td>\s*<td>([^<]*)<\/td>/i)?.[1]?.trim(),
                height: html.match(/Height<\/td>\s*<td>([^<]*)<\/td>/i)?.[1]?.trim()
            },
            alternatives: [],
            kits: []
        };

        // Procesar Alternativos y Kits
        $('.compareListProd').each((i, el) => {
            const altCode = $(el).find('h5').text().trim();
            const altDesc = $(el).find('.desLengthCheck').text().trim();
            if (altDesc.toLowerCase().includes('kit')) {
                data.kits.push({ code: altCode, desc: altDesc });
            } else if (altCode) {
                data.alternatives.push(altCode);
            }
        });

        console.log(`✅ Identidad aceptada. Datos: ${data.description}`);
        await syncToGoogle(data);

    } catch (err) {
        console.error("❌ Error Espejo:", err.message);
    }
}

async function syncToGoogle(d) {
    const auth = new JWT({ email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);
    await doc.loadInfo();
    const sheetF = doc.sheetsByTitle['MASTER_UNIFIED_V5'];
    const sheetK = doc.sheetsByTitle['MASTER_KITS_V1'];

    // Escribir Filtro Principal
    await sheetF.addRow({
        'Input Code': d.mainCode,
        'Description': d.description,
        'Thread Size': d.specs.thread || 'N/A',
        'Height (mm)': d.specs.height || 'N/A',
        'Outer Diameter (mm)': d.specs.od || 'N/A',
        'Audit Status': `V17_CHROME_MIRROR_SUCCESS`
    });

    // Escribir Kits detectados
    if (d.kits.length > 0) {
        for (const k of d.kits) {
            await sheetK.addRow({ 'Kit SKU': `EK-${k.code.slice(-5)}`, 'Original Code': k.code, 'Description': k.desc, 'Related Filter': d.mainCode });
        }
    }
}

app.get('/api/search/:code', (req, res) => {
    runChromeMirror(req.params.code.toUpperCase());
    res.json({ status: "MIRRORING", message: "Víctor, el bot está usando tu huella de Chrome. Revisa las hojas." });
});

app.listen(process.env.PORT || 8080);
