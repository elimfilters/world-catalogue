const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const axios = require('axios');
require('dotenv').config();

puppeteer.use(StealthPlugin());
const app = express();

const auth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});
const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);

async function extractWithAI(rawText) {
    try {
        console.log("[V32] 🤖 Consultando a Groq...");
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: "llama3-8b-8192",
            messages: [
                { role: "system", content: "Extrae solo el 'Thread Size'. Responde SOLO el valor. Si no hay, N/A." },
                { role: "user", content: `Texto: ${rawText.substring(0, 4000)}` }
            ]
        }, { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` } });
        return response.data.choices[0].message.content.trim();
    } catch (e) { return "N/A"; }
}

async function runV32(sku) {
    console.log(`[V32] ⚡ Teletransportando a: ${sku}`);
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    
    try {
        await page.goto(`https://shop.donaldson.com/store/es-us/search?Ntt=${sku}*`, { waitUntil: 'networkidle2' });
        
        // CAMBIO CRÍTICO: En lugar de click, obtenemos el link y navegamos
        const productUrl = await page.evaluate(() => {
            const link = document.querySelector('a.donaldson-part-details') || document.querySelector('a[href*="/product/"]');
            return link ? link.href : null;
        });

        if (!productUrl) throw new Error("Producto no encontrado en la búsqueda");

        console.log(`🔗 Saltando directo a: ${productUrl}`);
        await page.goto(productUrl, { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 3000)); // Pausa humana

        const bodyText = await page.evaluate(() => document.body.innerText);
        const thread = await extractWithAI(bodyText);

        console.log(`✅ IA Capturó: ${thread}`);

        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'];
        await sheet.addRow({
            'Input Code': sku,
            'Thread Size': thread,
            'Audit Status': `V32_SUCCESS_${new Date().toLocaleTimeString()}`
        });

        await browser.close();
        return { sku, thread };

    } catch (err) {
        await browser.close();
        console.error("❌ ERROR:", err.message);
        return { sku, status: "ERROR", msg: err.message };
    }
}

app.get('/api/search/:code', async (req, res) => {
    const result = await runV32(req.params.code.toUpperCase());
    res.json(result);
});

app.listen(process.env.PORT || 8080, () => console.log("🚀 V32.00 TELEPORT ONLINE"));
