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

// 🧠 FUNCIÓN DE INTELIGENCIA ARTIFICIAL (GROQ)
async function extractWithAI(rawText) {
    try {
        console.log("[V31] 🤖 Consultando a la IA Llama 3...");
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: "llama3-8b-8192",
            messages: [
                { role: "system", content: "Eres un extractor de datos técnicos. Tu única misión es encontrar el 'Thread Size' (Rosca) en el texto. Responde SOLO el valor (ej: 1-14 UN). Si no existe, responde 'N/A'." },
                { role: "user", content: `Extrae la rosca de este texto: ${rawText.substring(0, 4000)}` }
            ]
        }, {
            headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` }
        });
        return response.data.choices[0].message.content.trim();
    } catch (e) { return "N/A_AI_ERROR"; }
}

async function runV31(sku) {
    console.log(`[V31] 🛡️ Iniciando Misión Final para: ${sku}`);
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    
    try {
        await page.goto(`https://shop.donaldson.com/store/es-us/search?Ntt=${sku}*`, { waitUntil: 'networkidle2' });
        
        // Clic en el producto
        await page.waitForSelector('a[href*="/product/"]', { timeout: 8000 });
        await page.click('a[href*="/product/"]');
        await new Promise(r => setTimeout(r, 4000)); // Espera de carga humana

        // Capturamos TODO el texto de la página
        const bodyText = await page.evaluate(() => document.body.innerText);
        
        // PLAN A: Búsqueda rápida por código
        let thread = await page.evaluate(() => {
            const row = Array.from(document.querySelectorAll('tr')).find(r => r.innerText.includes('Thread Size'));
            return row ? row.querySelector('td:last-child').innerText.trim() : null;
        });

        // PLAN B: Si falló, Groq entra al rescate
        let method = "CODIGO_DIRECTO";
        if (!thread || thread === "N/A") {
            thread = await extractWithAI(bodyText);
            method = "IA_GROQ";
        }

        console.log(`✅ CAPTURADO (${method}): ${thread}`);

        // GUARDAR EN GOOGLE
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'];
        await sheet.addRow({
            'Input Code': sku,
            'Thread Size': thread,
            'Audit Status': `V31_${method}_${new Date().toLocaleTimeString()}`
        });

        await browser.close();
        return { sku, thread, method };

    } catch (err) {
        await browser.close();
        console.error("❌ FALLO TOTAL:", err.message);
        return { sku, status: "ERROR", msg: err.message };
    }
}

app.get('/api/search/:code', async (req, res) => {
    const result = await runV31(req.params.code.toUpperCase());
    res.json(result);
});

app.listen(process.env.PORT || 8080, () => console.log("🚀 V31.00 IA-STEALTH ONLINE"));
