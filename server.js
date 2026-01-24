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

app.get('/', (req, res) => res.send('<h1>✅ ELIMFILTERS ENGINE V104 IS ONLINE</h1>'));

app.get('/api/search/:code', async (req, res) => {
    const { code } = req.params;
    res.json({ status: "SUCCESS", message: `Recibido código: ${code}. Procesando en segundo plano...` });
    
    // --- INICIO DE PROCESO DE FONDO ---
    (async () => {
        let browser;
        try {
            await client.connect();
            const db = client.db('Cluster0');
            const col = db.collection('products');

            // 1. Clasificación Duty (Groq)
            const groqDuty = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "system", content: "Responde solo 'HD' o 'LD' analizando el código o fabricante." }, { role: "user", content: `Clasifica: ${code}` }]
            }, { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` } });
            const duty = groqDuty.data.choices[0].message.content.trim();

            if (duty === "HD") {
                browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox'] });
                const page = await browser.newPage();
                await page.goto(`https://shop.donaldson.com/store/es-us/search?Ntt=${code}*`, { waitUntil: 'networkidle2', timeout: 60000 });
                
                const productUrl = await page.evaluate(() => document.querySelector('.donaldson-part-details')?.href);
                if (productUrl) {
                    await page.goto(productUrl, { waitUntil: 'networkidle2' });
                    const donSku = await page.evaluate(() => document.querySelector('.donaldson-part-number')?.innerText.trim());
                    const donRaw = await page.evaluate(() => document.body.innerText);

                    // 2. Lógica SKU (Prefix + Last 4)
                    const last4 = donSku.replace(/[^0-9]/g, '').slice(-4);
                    let p = donRaw.toUpperCase().includes("AIR") ? "EA1" : donRaw.toUpperCase().includes("WATER") ? "ES9" : "EF9";
                    const elimSku = p + last4;
                    const tech = NARRATIVE[p].tech;
                    const desc = `Elimfilters® ${elimSku} delivers superior performance. ${tech} ${NARRATIVE[p].msg}.`;

                    // 3. Extracción de 39 Columnas (Groq)
                    const techData = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                        model: "llama-3.3-70b-versatile",
                        response_format: { type: "json_object" },
                        messages: [{ role: "system", content: "Extrae JSON técnico para 39 columnas. OEM y Cross solo números separados por comas." }, { role: "user", content: donRaw.substring(0, 12000) }]
                    }, { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` } });
                    const d = JSON.parse(techData.data.choices[0].message.content);

                    // 4. Escribir en Sheets
                    await doc.loadInfo();
                    const sheet = doc.sheetsByTitle["MASTER_UNIFIED_V5"];
                    await sheet.addRow([
                        code, elimSku, desc, d.type, d.subtype, d.install, p, tech, duty,
                        d.thread, d.h_mm, d.h_in, d.od_mm, d.od_in, d.id_mm, d.g_od_mm, d.g_od_in,
                        d.g_id_mm, d.g_id_in, d.iso, d.micron, d.beta, d.efficiency, d.pressure,
                        d.flow_l, d.flow_gpm, d.flow_cfm, d.burst, d.collapse, d.bypass, d.press_valve,
                        "No", d.special, d.oem, d.cross, d.equip_apps, d.alternatives, d.engines, d.years
                    ]);

                    // 5. Sincronizar MongoDB
                    await col.updateOne({ sku: elimSku }, { $set: { sku: elimSku, oem: code, data: d, duty, updated: new Date() } }, { upsert: true });
                    console.log(`✅ [V104] Procesado con éxito: ${elimSku}`);
                }
            }
        } catch (e) { console.error(`❌ [ERROR] ${code}:`, e.message); }
        finally { 
            if (browser) await browser.close();
            await client.close(); 
        }
    })();
});

app.listen(process.env.PORT || 8080, () => console.log("🚀 V104 FINAL DEPLOYED"));