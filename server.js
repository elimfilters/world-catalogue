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

// 🧠 CEREBRO DE CLASIFICACIÓN ELIMFILTERS 2026
const getElimBranding = (donSku, donDesc = "") => {
    const s = donSku.toUpperCase();
    const d = donDesc.toUpperCase();
    
    // 1. KITS (Mantiene EK por ahora como estándar de kits)
    if (s.startsWith('P559') || d.includes('KIT')) return { p: "EK", t: "DURATECH™", sku: s.replace(/^P/, 'EK') };
    
    // 2. AIRE (EA1 / EA2)
    if (d.includes('AIR FILTER')) return { p: "EA1", t: "MACROCORE™", sku: s.replace(/^P/, 'EA1') };
    if (d.includes('HOUSING') || d.includes('INTAKE')) return { p: "EA2", t: "INTEKCORE™", sku: s.replace(/^P/, 'EA2') };

    // 3. CABINA (EC1)
    if (d.includes('CABIN')) return { p: "EC1", t: "MICROKAPPA™", sku: s.replace(/^P/, 'EC1') };

    // 4. SECADORES (ED4)
    if (d.includes('DRYER')) return { p: "ED4", t: "DRYCORE™", sku: s.replace(/^P/, 'ED4') };

    // 5. COMBUSTIBLE (EF9 / ES9)
    if (d.includes('FUEL') && (d.includes('SEPARATOR') || d.includes('WATER'))) 
        return { p: "ES9", t: "FUEL AQUAGUARD", sku: s.replace(/^(P55|DBF|P)/, 'ES9') };
    if (d.includes('FUEL')) return { p: "EF9", t: "SYNTEPORE™", sku: s.replace(/^(P55|DBF|P)/, 'EF9') };

    // 6. HIDRÁULICOS (EH6)
    if (d.includes('HYDRAULIC')) return { p: "EH6", t: "NANOFORCE", sku: s.replace(/^(P55|DBF|P)/, 'EH6') };

    // 7. ACEITE (EL8)
    if (d.includes('OIL FILTER') || d.includes('LUBE')) return { p: "EL8", t: "SINTRAX™", sku: s.replace(/^(P55|DBF|P)/, 'EL8') };

    // 8. MARINOS Y TURBINA
    if (d.includes('MARINE')) return { p: "EM9", t: "MARINEGUARD", sku: s.replace(/^(P55|DBF|P)/, 'EM9') };
    if (d.includes('TURBINE')) return { p: "ET9", t: "TURBINE SERIES", sku: s.replace(/^(P55|DBF|P)/, 'ET9') };

    // Default 
    return { p: "EL8", t: "SINTRAX™", sku: s.replace(/^(P55|DBF|P)/, 'EL8') };
};

const clean = (v) => (!v || v === "N/A" || typeof v === 'object') ? "" : String(v).trim();

async function runV70(inputCode) {
    console.log(`[V70] 💎 Identidad ELIMFILTERS: ${inputCode}`);
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    try {
        await page.goto(`https://shop.donaldson.com/store/es-us/search?Ntt=${inputCode}*`, { waitUntil: 'networkidle2' });
        await page.waitForSelector('.donaldson-part-details', { timeout: 10000 });
        const productUrl = await page.evaluate(() => document.querySelector('a.donaldson-part-details')?.href);
        const donSku = await page.evaluate(() => document.querySelector('a.donaldson-part-details span')?.innerText.trim());
        const donDesc = await page.evaluate(() => document.querySelector('.donaldson-product-details')?.innerText.trim() || "");
        
        await page.goto(productUrl, { waitUntil: 'networkidle2' });
        const brand = getElimBranding(donSku || inputCode, donDesc);

        // IA para Type y Subtype
        const rawBody = await page.evaluate(() => document.body.innerText);
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" },
            messages: [{
                role: "system",
                content: "JSON: type (D), sub (E), oem (AJ), cross (AK). Solo números en AJ/AK."
            }, { role: "user", content: rawBody.substring(0, 12000) }]
        }, { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY.trim()}` } });

        const d = JSON.parse(response.data.choices[0].message.content);
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'];

        await sheet.addRow({
            'Input Code': inputCode,
            'ELIMFILTERS SKU': brand.sku,
            'Description': donDesc,
            'Filter Type': clean(d.type),          // D
            'Subtype': clean(d.sub),              // E
            'Prefix': brand.p,                       // G
            'ELIMFILTERS Technology': brand.t,       // H
            'OEM Codes': clean(d.oem),               // AJ
            'Cross Reference Codes': clean(d.cross),  // AK
            'Technical Sheet URL': productUrl
        });

        await browser.close();
        return { status: "EXITO_V70", sku: brand.sku, tech: brand.t };
    } catch (err) {
        if (browser) await browser.close();
        return { status: "ERROR", msg: err.message };
    }
}
app.get('/api/search/:code', async (req, res) => res.json(await runV70(req.params.code)));
app.listen(process.env.PORT || 8080, () => console.log("🚀 V70.00 ELIM-TOTAL ONLINE"));
