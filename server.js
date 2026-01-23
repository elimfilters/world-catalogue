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

const cleanValue = (v) => (v === null || v === undefined) ? "N/A" : String(v).trim();

async function runV49(sku) {
    console.log(`[V49] 📡 Iniciando rastreo para: ${sku}`);
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    try {
        await page.goto(`https://shop.donaldson.com/store/es-us/search?Ntt=${sku}*`, { waitUntil: 'networkidle2' });
        const productUrl = await page.evaluate(() => document.querySelector('a.donaldson-part-details')?.href);

        if (!productUrl) throw new Error("SKU_NOT_FOUND");
        await page.goto(productUrl, { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 4000));

        const fullText = await page.evaluate(() => document.body.innerText.substring(0, 15000));
        
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: "Extrae JSON: desc, oem_codes, cross_ref, equipment." }
            ]
        }, { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY.trim()}` } });

        const d = JSON.parse(response.data.choices[0].message.content);
        
        // --- LOG DE CONTROL ---
        console.log(`[V49] 📝 Datos preparados para enviar: ${d.desc.substring(0, 30)}...`);

        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'];
        
        if (!sheet) {
            console.error("❌ ERROR: No se encontró la pestaña 'MASTER_UNIFIED_V5'");
            return { sku, status: "ERROR_TAB_NOT_FOUND" };
        }

        const newRow = {
            'Input Code': sku,
            'Description': cleanValue(d.desc),
            'OEM Codes': cleanValue(d.oem_codes),
            'Cross Reference Codes': cleanValue(d.cross_ref),
            'Equipment Applications': cleanValue(d.equipment),
            'Technical Sheet URL': productUrl
        };

        await sheet.addRow(newRow);
        console.log(`[V49] ✅ FILA ESCRITA CON ÉXITO EN GOOGLE SHEETS`);

        await browser.close();
        return { sku, status: "EXITO" };

    } catch (err) {
        if (browser) await browser.close();
        console.error(`[V49] ❌ ERROR CRÍTICO: ${err.message}`);
        return { sku, status: "ERROR", msg: err.message };
    }
}

app.get('/api/search/:code', async (req, res) => { res.json(await runV49(req.params.code.toUpperCase())); });
app.listen(process.env.PORT || 8080, () => console.log("🚀 V49.00 TRACKER ONLINE"));
