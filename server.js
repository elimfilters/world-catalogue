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

async function runV50(sku) {
    console.log(`[V50] 🔍 Usando librería de Jules para: ${sku}`);
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    try {
        await page.goto(`https://shop.donaldson.com/store/es-us/search?Ntt=${sku}*`, { waitUntil: 'networkidle2' });
        const productUrl = await page.evaluate(() => document.querySelector('a.donaldson-part-details')?.href);
        if (!productUrl) throw new Error("SKU_NOT_FOUND");
        
        await page.goto(productUrl, { waitUntil: 'networkidle2' });
        const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 10000));
        
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" },
            messages: [{ role: "system", content: "Extrae JSON: desc, oem, cross, equip" }, { role: "user", content: bodyText }]
        }, { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY.trim()}` } });

        const d = JSON.parse(response.data.choices[0].message.content);

        // --- CONEXIÓN PURA CON JULES ---
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'];
        
        // Verificamos qué columnas ve Jules en tu Sheet
        await sheet.loadHeaderRow();
        console.log("[V50] 📋 Columnas detectadas en tu Sheet:", sheet.headerValues);

        const rowData = {
            'Input Code': sku,
            'Description': d.desc || "N/A",
            'OEM Codes': d.oem || "N/A",
            'Cross Reference Codes': d.cross || "N/A",
            'Equipment Applications': d.equip || "N/A",
            'Technical Sheet URL': productUrl
        };

        console.log("[V50] 📤 Intentando escribir fila...");
        await sheet.addRow(rowData);
        
        await browser.close();
        console.log("✅ ¡ESCRITO!");
        return { sku, status: "EXITO_REAL" };

    } catch (err) {
        if (browser) await browser.close();
        console.error(`[V50] ❌ ERROR: ${err.message}`);
        return { sku, status: "ERROR", msg: err.message };
    }
}

app.get('/api/search/:code', async (req, res) => res.json(await runV50(req.params.code.toUpperCase())));
app.listen(process.env.PORT || 8080, () => console.log("🚀 V50.00 JULES EDITION ONLINE"));
