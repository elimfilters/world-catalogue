const express = require('express');
const { MongoClient } = require('mongodb');
const axios = require('axios');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

puppeteer.use(StealthPlugin());
const app = express();

// 1. CONEXIONES
const auth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});
const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);
const client = new MongoClient(process.env.MONGO_URL);

// 2. NARRATIVA DE BRANDING
const NARRATIVE = {
    "EA1": { tech: "MACROCORE™", msg: "aire 100% puro al motor" },
    "EF9": { tech: "SYNTEPORE™", msg: "armadura sintética, combustible 100% al motor" },
    "ES9": { tech: "FUEL AQUAGUARD", msg: "protección total contra el agua" },
    "EL8": { tech: "SINTRAX™", msg: "lubricación extrema para el sistema" }
};

// --- ELIMFILTERS MASTER ENGINE V105 ---

async function classifyDuty(code) {
    const groqDuty = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: "Responde solo 'HD' o 'LD' analizando el código o fabricante." }, { role: "user", content: `Clasifica: ${code}` }]
    }, { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` } });
    return groqDuty.data.choices[0].message.content.trim();
}

async function scrapeDonaldson(code) {
    let browser;
    try {
        browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.goto(`https://shop.donaldson.com/store/es-us/search?Ntt=${code}*`, { waitUntil: 'networkidle2', timeout: 60000 });

        const productUrl = await page.evaluate(() => document.querySelector('.donaldson-part-details')?.href);
        if (productUrl) {
            await page.goto(productUrl, { waitUntil: 'networkidle2' });
            const donSku = await page.evaluate(() => document.querySelector('.donaldson-part-number')?.innerText.trim());
            const donRaw = await page.evaluate(() => document.body.innerText);
            return { donSku, donRaw };
        }
        return null;
    } finally {
        if (browser) await browser.close();
    }
}

function generateSku(donSku, donRaw) {
    const last4 = donSku.replace(/[^0-9]/g, '').slice(-4);
    let p = donRaw.toUpperCase().includes("AIR") ? "EA1" : donRaw.toUpperCase().includes("WATER") ? "ES9" : "EF9";
    const elimSku = p + last4;
    const tech = NARRATIVE[p].tech;
    const desc = `Elimfilters® ${elimSku} delivers superior performance. ${tech} ${NARRATIVE[p].msg}.`;
    return { elimSku, p, tech, desc };
}

async function extractTechData(donRaw) {
    const techData = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: "Extrae JSON técnico para 39 columnas. OEM y Cross solo números separados por comas." }, { role: "user", content: donRaw.substring(0, 12000) }]
    }, { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` } });
    return JSON.parse(techData.data.choices[0].message.content);
}

async function writeToSheets(data) {
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle["MASTER_UNIFIED_V5"];
    await sheet.addRow([
        data.code, data.elimSku, data.desc, data.d.type, data.d.subtype, data.d.install, data.p, data.tech, data.duty,
        data.d.thread, data.d.h_mm, data.d.h_in, data.d.od_mm, data.d.od_in, data.d.id_mm, data.d.g_od_mm, data.d.g_od_in,
        data.d.g_id_mm, data.d.g_id_in, data.d.iso, data.d.micron, data.d.beta, data.d.efficiency, data.d.pressure,
        data.d.flow_l, data.d.flow_gpm, data.d.flow_cfm, data.d.burst, data.d.collapse, data.d.bypass, data.d.press_valve,
        "No", data.d.special, data.d.oem, data.d.cross, data.d.equip_apps, data.d.alternatives, data.d.engines, data.d.years
    ]);
}

async function syncMongo(db, elimSku, code, data, duty) {
    const col = db.collection('products');
    await col.updateOne({ sku: elimSku }, { $set: { sku: elimSku, oem: code, data: data, duty, updated: new Date() } }, { upsert: true });
}

app.get('/', (req, res) => res.send('<h1>✅ ELIMFILTERS MASTER ENGINE V105 IS ONLINE</h1>'));

app.get('/api/search/:code', async (req, res) => {
    const { code } = req.params;
    res.json({ status: "SUCCESS", message: `Recibido código: ${code}. Procesando en segundo plano...` });
    
    (async () => {
        try {
            await client.connect();
            const db = client.db('Cluster0');

            const duty = await classifyDuty(code);

            if (duty === "HD") {
                const donaldsonData = await scrapeDonaldson(code);
                if (donaldsonData) {
                    const { donSku, donRaw } = donaldsonData;
                    const { elimSku, p, tech, desc } = generateSku(donSku, donRaw);
                    const techDataJson = await extractTechData(donRaw);

                    await writeToSheets({ code, elimSku, desc, p, tech, duty, d: techDataJson });
                    await syncMongo(db, elimSku, code, techDataJson, duty);

                    console.log(`✅ [V105] Procesado con éxito: ${elimSku}`);
                }
            }
        } catch (e) { console.error(`❌ [ERROR V105] ${code}:`, e.message); }
        finally { 
            await client.close(); 
        }
    })();
});

app.listen(process.env.PORT || 8080, () => console.log("🚀 V105 FINAL DEPLOYED"));