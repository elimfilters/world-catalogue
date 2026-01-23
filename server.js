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

const clean = (v) => (v === null || v === undefined) ? "N/A" : String(v).trim();

async function runV49(sku) {
    console.log(`[V49.01] 📡 Rastreo de Conexión para: ${sku}`);
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    try {
        await page.goto(`https://shop.donaldson.com/store/es-us/search?Ntt=${sku}*`, { waitUntil: 'networkidle2' });
        const productUrl = await page.evaluate(() => document.querySelector('a.donaldson-part-details')?.href);
        if (!productUrl) throw new Error("SKU_NOT_FOUND");
        await page.goto(productUrl, { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 3000));
        const txt = await page.evaluate(() => document.body.innerText.substring(0, 10000));
        
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" },
            messages: [{ role: "system", content: "Extrae JSON: desc, oem_codes, cross_ref, equipment." }, { role: "user", content: txt }]
        }, { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY.trim()}` } });

        const d = JSON.parse(response.data.choices[0].message.content);
        console.log(`[V49.01] 📝 Datos listos: ${d.desc ? d.desc.substring(0, 20) : 'Sin desc'}`);

        await doc.loadInfo();
        // --- ATENCIÓN AQUÍ ---
        const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'];
        if (!sheet) {
            console.error("❌ ERROR: La pestaña 'MASTER_UNIFIED_V5' NO EXISTE");
            return { sku, status: "ERROR_PESTANA_NO_EXISTE" };
        }

        await sheet.addRow({
            'Input Code': sku,
            'Description': clean(d.desc),
            'OEM Codes': clean(d.oem_codes),
            'Cross Reference Codes': clean(d.cross_ref),
            'Equipment Applications': clean(d.equipment),
            'Technical Sheet URL': productUrl
        });
        console.log(`[V49.01] ✅ ESCRITURA CONFIRMADA EN GOOGLE`);
        await browser.close();
        return { sku, status: "EXITO" };
    } catch (err) {
        if (browser) await browser.close();
        console.error(`[V49.01] ❌ FALLO: ${err.message}`);
        return { sku, status: "ERROR", msg: err.message };
    }
}
app.get('/api/search/:code', async (req, res) => { res.json(await runV49(req.params.code.toUpperCase())); });
app.listen(process.env.PORT || 8080, () => console.log("🚀 V49.01 TRACKER ONLINE - ID:FORCE_UPDATE_99"));
