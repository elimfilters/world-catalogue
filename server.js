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

// 🧬 IDENTIDAD DE KITS ELIMFILTERS (V5.06)
const getElimBranding = (donSku, donDesc = "") => {
    const s = donSku.toUpperCase().replace(/[^0-9]/g, ''); 
    const d = donDesc.toUpperCase();
    
    // DETECCIÓN DE KITS
    if (donSku.toUpperCase().startsWith('P559') || d.includes('KIT')) {
        // Marcas de Maquinaria Pesada para EK5
        const heavyDutyBrands = ['CATERPILLAR', 'CAT ', 'KOMATSU', 'JOHN DEERE', 'VOLVO', 'CUMMINS', 'CASE', 'DOOSAN', 'HITACHI'];
        const isHD = heavyDutyBrands.some(brand => d.includes(brand)) || d.includes('HEAVY DUTY');
        
        const pref = isHD ? "EK5" : "EK3"; // Si no es HD, es LD (Toyota, Nissan, etc.)
        return { p: pref, t: "DURATECH™", sku: pref + s.slice(-4) };
    }

    // FILTROS INDIVIDUALES (Lógica anterior EF9, EA1, EL8...)
    if (d.includes('AIR FILTER')) return { p: "EA1", t: "MACROCORE™", sku: "EA1" + s };
    if (d.includes('CABIN')) return { p: "EC1", t: "MICROKAPPA™", sku: "EC1" + s };
    if (d.includes('FUEL') && (d.includes('SEPARATOR') || d.includes('WATER'))) 
        return { p: "ES9", t: "FUEL AQUAGUARD", sku: "ES9" + s };
    if (d.includes('FUEL')) return { p: "EF9", t: "SYNTEPORE™", sku: "EF9" + s };
    if (d.includes('OIL') || d.includes('LUBE')) return { p: "EL8", t: "SINTRAX™", sku: "EL8" + s };
    
    return { p: "EL8", t: "SINTRAX™", sku: "EL8" + s };
};

const clean = (v) => (!v || v === "N/A" || typeof v === 'object') ? "" : String(v).trim();

async function runV78(inputCode) {
    console.log(`[V78] 📦 Extrayendo componentes del Kit DURATECH™: ${inputCode}`);
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    try {
        await page.goto(`https://shop.donaldson.com/store/es-us/search?Ntt=${inputCode}*`, { waitUntil: 'networkidle2' });
        await page.waitForSelector('.donaldson-part-details', { timeout: 10000 });
        const donSku = await page.evaluate(() => document.querySelector('a.donaldson-part-details span')?.innerText.trim());
        const donDesc = await page.evaluate(() => document.querySelector('.donaldson-product-details')?.innerText.trim() || "");
        const productUrl = await page.evaluate(() => document.querySelector('a.donaldson-part-details')?.href);

        const brand = getElimBranding(donSku || inputCode, donDesc);
        await page.goto(productUrl, { waitUntil: 'networkidle2' });

        // IA: Extracción específica para Kits en Columna AN
        const rawBody = await page.evaluate(() => document.body.innerText);
        const prompt = brand.p.startsWith('EK') 
            ? `Identifica los filtros incluidos en este KIT. Devuelve JSON con: kit_list (Lista: Aceite: [cod], Aire: [cod], etc), engine (Modelos de motor), type, sub.`
            : `Extrae especificaciones técnicas: type, sub, oem, cross.`;

        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" },
            messages: [{ role: "system", content: prompt }, { role: "user", content: rawBody.substring(0, 12000) }]
        }, { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY.trim()}` } });

        const d = JSON.parse(response.data.choices[0].message.content);
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'];

        await sheet.addRow({
            'Input Code': inputCode,
            'ELIMFILTERS SKU': brand.sku,
            'Description': donDesc,
            'Filter Type': clean(d.type),
            'Subtype': clean(d.sub),
            'Prefix': brand.p,
            'ELIMFILTERS Technology': brand.t,
            'Equipment Filters List': clean(d.kit_list), // Columna AN: Desglose total
            'Engine Applications': clean(d.engine),      // Columna AO
            'Technical Sheet URL': productUrl
        });

        await browser.close();
        return { status: "EXITO_V78", sku: brand.sku, prefix: brand.p };
    } catch (err) {
        if (browser) await browser.close();
        return { status: "ERROR", msg: err.message };
    }
}
app.get('/api/search/:code', async (req, res) => res.json(await runV78(req.params.code)));
app.listen(process.env.PORT || 8080, () => console.log("🚀 V78.00 DURATECH™ MASTER ONLINE"));
