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

async function runV41(sku) {
    console.log(`[V41] 🕵️ Analizando patrones de códigos para: ${sku}`);
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    
    try {
        await page.goto(`https://shop.donaldson.com/store/es-us/search?Ntt=${sku}*`, { waitUntil: 'networkidle2' });
        const productUrl = await page.evaluate(() => {
            const link = document.querySelector('a.donaldson-part-details') || document.querySelector('a[href*="/product/"]');
            return link ? link.href : null;
        });

        if (!productUrl) throw new Error("SKU_NOT_FOUND");
        await page.goto(productUrl, { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 6000)); 

        const bodyText = await page.evaluate(() => document.body.innerText.replace(/\s\s+/g, ' ').substring(0, 15000));
        
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" },
            messages: [
                { 
                    role: "system", 
                    content: `Eres un experto en inteligencia de filtros. Los nombres de fabricantes no aparecen por razones legales. 
                    Tu tarea es identificar el fabricante por el PATRÓN del código:
                    1. OEM CODES: Identifica códigos de maquinaria (ej: Caterpillar, Cummins, Komatsu, Volvo, John Deere).
                    2. CROSS REFERENCE: Identifica marcas de filtros (ej: Baldwin, Fleetguard, Wix, Mann, Fram, Parker).
                    3. INCLUYE SIEMPRE DONALDSON como el fabricante de origen si el SKU coincide.
                    Responde en JSON: oem_codes, cross_ref_codes, desc, thread, height_mm, od_mm.` 
                },
                { role: "user", content: `Analiza esta lista de códigos para el filtro ${sku}. Identifica cuáles son de equipo original (OEM) y cuáles de competencia (filtros) según su nomenclatura: ${bodyText}` }
            ]
        }, { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY.trim()}` } });

        const d = JSON.parse(response.data.choices[0].message.content);
        
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'];
        
        await sheet.addRow({
            'Input Code': sku,
            'Description': d.desc || `Donaldson ${sku}`,
            'OEM Codes': d.oem_codes,
            'Cross Reference Codes': d.cross_ref_codes,
            'Thread Size': d.thread,
            'Height (mm)': d.height_mm,
            'Outer Diameter (mm)': d.od_mm,
            'Technical Sheet URL': productUrl,
            'Audit Status': `V41_PATTERN_DETECTED_${new Date().toLocaleTimeString()}`
        });

        await browser.close();
        return { sku, status: "EXITO" };

    } catch (err) {
        if (browser) await browser.close();
        return { sku, status: "ERROR", msg: err.message };
    }
}

app.get('/api/search/:code', async (req, res) => {
    const result = await runV41(req.params.code.toUpperCase());
    res.json(result);
});

app.listen(process.env.PORT || 8080);
