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

// FUNCIÓN MAESTRA PARA APLANAR OBJETOS DE LA IA
const flattenToText = (val) => {
    if (!val) return "N/A";
    if (Array.isArray(val)) {
        return val.map(item => {
            if (typeof item === 'object' && item !== null) {
                // Si es un objeto tipo {manufacturer, part}, lo unimos
                const m = item.manufacturer || item.brand || "";
                const p = item.part || item.code || "";
                return `${m} ${p}`.trim();
            }
            return String(item);
        }).join(', ');
    }
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
};

async function runV51(sku) {
    console.log(`[V51] 🛠️ Aplanando datos complejos para: ${sku}`);
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    try {
        await page.goto(`https://shop.donaldson.com/store/es-us/search?Ntt=${sku}*`, { waitUntil: 'networkidle2' });
        const productUrl = await page.evaluate(() => document.querySelector('a.donaldson-part-details')?.href);
        if (!productUrl) throw new Error("SKU_NOT_FOUND");
        
        await page.goto(productUrl, { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 3000)); // Espera para carga dinámica
        const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 15000));
        
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: "Extrae JSON: desc, oem_codes, cross_ref, equipment. Los códigos deben ser listas." },
                { role: "user", content: bodyText }
            ]
        }, { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY.trim()}` } });

        const d = JSON.parse(response.data.choices[0].message.content);

        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'];
        
        const rowData = {
            'Input Code': sku,
            'Description': flattenToText(d.desc),
            'OEM Codes': flattenToText(d.oem_codes),
            'Cross Reference Codes': flattenToText(d.cross_ref),
            'Equipment Applications': flattenToText(d.equipment),
            'Technical Sheet URL': productUrl
        };

        console.log("[V51] 📤 Enviando datos aplanados a Google...");
        await sheet.addRow(rowData);
        
        await browser.close();
        console.log("✅ ¡POR FIN ESCRITO EN EL SHEET!");
        return { sku, status: "EXITO" };

    } catch (err) {
        if (browser) await browser.close();
        console.error(`[V51] ❌ ERROR: ${err.message}`);
        return { sku, status: "ERROR", msg: err.message };
    }
}

app.get('/api/search/:code', async (req, res) => res.json(await runV51(req.params.code.toUpperCase())));
app.listen(process.env.PORT || 8080, () => console.log("🚀 V51.00 THE FLATTENER ONLINE"));
