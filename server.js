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

// 1. CONFIGURACIONES DE CONEXIÓN
const auth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});
const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);
const mongoUri = process.env.MONGO_URI; 
const client = new MongoClient(mongoUri);

// 🧬 MATRIZ DE NARRATIVA COMERCIAL
const NARRATIVE_MAP = {
    "EA1": { tech: "MACROCORE™", msg: "aire 100% puro al motor" },
    "EF9": { tech: "SYNTEPORE™", msg: "armadura sintética, combustible 100% al motor" },
    "ES9": { tech: "FUEL AQUAGUARD", msg: "protección total contra el agua" },
    "EL8": { tech: "SINTRAX™", msg: "lubricación extrema para el sistema" }
};

// 🛠️ FUNCIÓN: CHEQUEAR EXISTENCIA EN DB (PASO 1)
async function checkExistingSku(code) {
    try {
        await client.connect();
        const db = client.db('Cluster0');
        const collection = db.collection('products'); // Ajustar nombre de colección
        // Buscar en columnas OEM (AH) y Cross (AI)
        const existing = await collection.findOne({
            $or: [{ "OEM_Codes": { $regex: code, $options: 'i' } }, { "Cross_Reference": { $regex: code, $options: 'i' } }]
        });
        return existing;
    } finally { await client.close(); }
}

async function runV100(inputCode) {
    console.log(`[V100] 🔍 Iniciando Protocolo para: ${inputCode}`);

    // PASO 1: VERIFICAR SI YA EXISTE
    const existingProduct = await checkExistingSku(inputCode);
    if (existingProduct) {
        console.log("✅ Producto encontrado en DB. Enviando al plugin...");
        return { status: "EXISTING", data: existingProduct };
    }

    // PASO 2: CLASIFICACIÓN DE DUTY CON GROQ
    const dutyResponse = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: "llama-3.3-70b-versatile",
        messages: [{
            role: "system",
            content: "Eres un experto en filtración. Clasifica el código como 'HD' (Heavy Duty) o 'LD' (Light Duty) basado en fabricante y aplicación. Responde solo con 'HD' o 'LD'."
        }, { role: "user", content: `Clasifica este código: ${inputCode}` }]
    }, { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` } });

    const duty = dutyResponse.data.choices[0].message.content.trim();
    console.log(`🧠 Veredicto Groq: ${duty}`);

    if (duty === "LD") return { status: "LD_PENDING", msg: "Scraper de FRAM en desarrollo" };

    // PASO 3: SCRAPER DONALDSON (HD)
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    try {
        await page.goto(`https://shop.donaldson.com/store/es-us/search?Ntt=${inputCode}*`, { waitUntil: 'networkidle2' });
        const productUrl = await page.evaluate(() => document.querySelector('.donaldson-part-details')?.href);
        if (!productUrl) throw new Error("Código no hallado en Donaldson");

        await page.goto(productUrl, { waitUntil: 'networkidle2' });
        const donSku = await page.evaluate(() => document.querySelector('.donaldson-part-number')?.innerText.trim());
        const donDesc = await page.evaluate(() => document.body.innerText);

        // PASO 4: FORJA DEL SKU (Prefijo + Últimos 4)
        const digits = donSku.replace(/[^0-9]/g, '');
        const last4 = digits.slice(-4);
        let prefix = donDesc.includes('AIR') ? "EA1" : donDesc.includes('WATER') ? "ES9" : "EF9";
        const finalSku = prefix + last4;

        // PASO 5: NARRATIVA GROQ INTERVENIDA
        const nar = NARRATIVE_MAP[prefix] || NARRATIVE_MAP["EL8"];
        const finalDesc = `Elimfilters® ${finalSku} delivers superior performance. ${nar.tech} ${nar.msg}. Meets or exceeds OEM specifications.`;

        // PASO 6: GUARDAR EN GOOGLE SHEETS Y RESPONDER
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle["MASTER_UNIFIED_V5"];
        await sheet.addRow({
            'Input Code': inputCode, 'ELIMFILTERS SKU': finalSku, 'Description': finalDesc, 'Duty': duty
            // ... (Resto de las 39 columnas se llenan aquí con los datos del scraper)
        });

        await browser.close();
        return { status: "CREATED", sku: finalSku, description: finalDesc };
    } catch (err) {
        await browser.close();
        return { status: "ERROR", msg: err.message };
    }
}

app.get('/api/search/:code', async (req, res) => res.json(await runV100(req.params.code)));
app.listen(process.env.PORT || 8080, () => console.log("🚀 V100 MASTER ARCHITECT ONLINE"));
