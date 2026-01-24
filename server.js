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

// 🛡️ LÓGICA MAESTRA V5.07: EXCEPCIÓN ET9 + KITS
const getElimIdentity = (donSku, donDesc = "", input = "") => {
    const s = donSku.toUpperCase();
    const d = donDesc.toUpperCase();
    const inp = input.toUpperCase();
    const numsOnly = s.replace(/[^0-9]/g, '');

    // --- 1. EXCEPCIÓN ET9 (TURBINE SERIES 2020, 2040, 2010) ---
    if (s.includes('2020') || s.includes('2040') || s.includes('2010') || d.includes('TURBINE')) {
        let suffix = "";
        if (inp.includes('PM') || s.includes('PM')) suffix = "P";
        else if (inp.includes('TM') || s.includes('TM')) suffix = "T";
        else if (inp.includes('SM') || s.includes('SM')) suffix = "S";
        
        // El SKU usa los 4 números + el sufijo del micraje
        const core = s.match(/2020|2040|2010/) ? s.match(/2020|2040|2010/)[0] : numsOnly.slice(-4);
        return { p: "ET9", t: "TURBINE SERIES", sku: "ET9" + core + suffix };
    }

    // --- 2. KITS (EK3 / EK5) ---
    if (s.startsWith('P559') || d.includes('KIT')) {
        const heavyDutyBrands = ['CATERPILLAR', 'CAT ', 'KOMATSU', 'JOHN DEERE', 'VOLVO', 'CUMMINS'];
        const isHD = heavyDutyBrands.some(brand => d.includes(brand)) || d.includes('HEAVY DUTY');
        const pref = isHD ? "EK5" : "EK3";
        return { p: pref, t: "DURATECH™", sku: pref + numsOnly.slice(-4) };
    }

    // --- 3. FILTROS INDIVIDUALES ---
    if (d.includes('AIR FILTER')) return { p: "EA1", t: "MACROCORE™", sku: "EA1" + numsOnly };
    if (d.includes('CABIN')) return { p: "EC1", t: "MICROKAPPA™", sku: "EC1" + numsOnly };
    if (d.includes('FUEL') && (d.includes('SEPARATOR') || d.includes('WATER'))) 
        return { p: "ES9", t: "FUEL AQUAGUARD", sku: "ES9" + numsOnly };
    if (d.includes('FUEL')) return { p: "EF9", t: "SYNTEPORE™", sku: "EF9" + numsOnly };
    if (d.includes('OIL') || d.includes('LUBE')) return { p: "EL8", t: "SINTRAX™", sku: "EL8" + numsOnly };
    if (d.includes('HYDRAULIC')) return { p: "EH6", t: "NANOFORCE", sku: "EH6" + numsOnly };

    return { p: "EL8", t: "SINTRAX™", sku: "EL8" + numsOnly };
};

const clean = (v) => (!v || v === "N/A" || typeof v === 'object') ? "" : String(v).trim();

async function runV79(inputCode) {
    console.log(`[V79] 🌪️ Procesando: ${inputCode}`);
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    try {
        await page.goto(`https://shop.donaldson.com/store/es-us/search?Ntt=${inputCode}*`, { waitUntil: 'networkidle2' });
        await page.waitForSelector('.donaldson-part-details', { timeout: 10000 });
        const donSku = await page.evaluate(() => document.querySelector('a.donaldson-part-details span')?.innerText.trim());
        const donDesc = await page.evaluate(() => document.querySelector('.donaldson-product-details')?.innerText.trim() || "");
        const productUrl = await page.evaluate(() => document.querySelector('a.donaldson-part-details')?.href);

        const brand = getElimIdentity(donSku || inputCode, donDesc, inputCode);
        await page.goto(productUrl, { waitUntil: 'networkidle2' });

        const rawBody = await page.evaluate(() => document.body.innerText);
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" },
            messages: [{
                role: "system", content: "Extrae JSON: type (D), sub (E), oem (AJ), cross (AK), flow_gpm (para ET9)."
            }, { role: "user", content: rawBody.substring(0, 10000) }]
        }, { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY.trim()}` } });

        const d = JSON.parse(response.data.choices[0].message.content);
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'];

        await sheet.addRow({
            'Input Code': inputCode,
            'ELIMFILTERS SKU': brand.sku,
            'Prefix': brand.p,
            'ELIMFILTERS Technology': brand.t,
            'Description': donDesc,
            'Filter Type': clean(d.type),
            'Subtype': clean(d.sub),
            'Rated Flow (GPM)': clean(d.flow_gpm),
            'OEM Codes': clean(d.oem),
            'Cross Reference Codes': clean(d.cross),
            'Technical Sheet URL': productUrl
        });

        await browser.close();
        return { status: "SUCCESS", sku: brand.sku, tech: brand.t };
    } catch (err) {
        if (browser) await browser.close();
        return { status: "ERROR", msg: err.message };
    }
}
app.get('/api/search/:code', async (req, res) => res.json(await runV79(req.params.code)));
app.listen(process.env.PORT || 8080, () => console.log("🚀 V79.00 TURBINE-PRO ONLINE"));
