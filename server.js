const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const { MongoClient } = require('mongodb');
const axios = require('axios');
require('dotenv').config();

puppeteer.use(StealthPlugin());
const app = express();

// 1. CONEXIONES (Usando MONGO_URL de tu Railway)
const auth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});
const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);
const client = new MongoClient(process.env.MONGO_URL);

// 🧬 MATRIZ DE NARRATIVA ELIMFILTERS
const NARRATIVE = {
    "EA1": { tech: "MACROCORE™", msg: "aire 100% puro al motor" },
    "EF9": { tech: "SYNTEPORE™", msg: "armadura sintética, combustible 100% al motor" },
    "ES9": { tech: "FUEL AQUAGUARD", msg: "protección total contra el agua" },
    "EL8": { tech: "SINTRAX™", msg: "lubricación extrema para el sistema" }
};

// 🛠️ PASO 1: BUSCAR SI EL SKU EXISTE EN MONGO O SHEETS
async function findExisting(code) {
    try {
        await client.connect();
        const db = client.db('Cluster0');
        const col = db.collection('products');
        return await col.findOne({
            $or: [{ "oem": { $regex: code, $options: 'i' } }, { "cross": { $regex: code, $options: 'i' } }]
        });
    } catch (e) { return null; }
    finally { await client.close(); }
}

async function startEngine(inputCode) {
    console.log(`[ENGINE] 🔍 Procesando: ${inputCode}`);
    
    // 1. Check Existencia
    const exists = await findExisting(inputCode);
    if (exists) return { status: "SUCCESS", source: "DATABASE", data: exists };

    // 2. Juicio de Groq (Duty Check)
    const groqRes = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: "Responde solo 'HD' o 'LD' analizando el código." },
                   { role: "user", content: `Clasifica: ${inputCode}` }]
    }, { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` } });

    const duty = groqRes.data.choices[0].message.content.trim();
    if (duty === "LD") return { status: "INFO", msg: "LD detectado. Scraper FRAM próximamente." };

    // 3. Scraper Donaldson (HD)
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    try {
        await page.goto(`https://shop.donaldson.com/store/es-us/search?Ntt=${inputCode}*`, { waitUntil: 'networkidle2' });
        const productUrl = await page.evaluate(() => document.querySelector('.donaldson-part-details')?.href);
        if (!productUrl) throw new Error("No encontrado en Donaldson");

        await page.goto(productUrl, { waitUntil: 'networkidle2' });
        const donSku = await page.evaluate(() => document.querySelector('.donaldson-part-number')?.innerText.trim());
        const donDesc = await page.evaluate(() => document.body.innerText.toUpperCase());

        // 4. Lógica de Identidad (Prefix + Last 4)
        const digits = donSku.replace(/[^0-9]/g, '');
        const last4 = digits.slice(-4);
        let p = "EL8";
        if (donDesc.includes("AIR")) p = "EA1";
        else if (donDesc.includes("FUEL") && donDesc.includes("WATER")) p = "ES9";
        else if (donDesc.includes("FUEL")) p = "EF9";

        const finalSku = p + last4;
        const nar = NARRATIVE[p];
        const elimDesc = `Elimfilters® ${finalSku} delivers superior performance. ${nar.tech} ${nar.msg}.`;

        // 5. Groq extrae las 39 columnas técnicas
        const techRes = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" },
            messages: [{ role: "system", content: "Extrae JSON para 39 columnas técnicas. OEM y Cross solo números separados por comas." },
                       { role: "user", content: donDesc.substring(0, 10000) }]
        }, { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` } });

        const d = JSON.parse(techRes.data.choices[0].message.content);

        // 6. Guardar en Google Sheets (MASTER_UNIFIED_V5)
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle["MASTER_UNIFIED_V5"];
        await sheet.addRow([
            inputCode, finalSku, elimDesc, d.type, d.subtype, d.install, p, nar.tech, duty,
            d.thread, d.h_mm, d.h_in, d.od_mm, d.od_in, d.id_mm, d.g_od_mm, d.g_od_in,
            d.g_id_mm, d.g_id_in, d.iso, d.micron, d.beta, d.efficiency, d.pressure,
            d.flow_l, d.flow_gpm, d.flow_cfm, d.burst, d.collapse, d.bypass, d.press_valve,
            "No", d.special, d.oem, d.cross, d.equip_apps, d.alternatives, d.engines, d.years
        ]);

        await browser.close();
        return { status: "SUCCESS", source: "NEW_CREATED", sku: finalSku };
    } catch (err) {
        if (browser) await browser.close();
        return { status: "ERROR", msg: err.message };
    }
}

app.get('/api/search/:code', async (req, res) => res.json(await startEngine(req.params.code)));
app.listen(process.env.PORT || 8080, () => console.log("🚀 V100 MASTER ARCHITECT DEPLOYED"));
