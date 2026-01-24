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

// 🎯 SELECTOR DE PROMPT SEGÚN ADN ELIMFILTERS
const getSpecPrompt = (prefix) => {
    const base = "type (D), sub (E), oem (AJ), cross (AK). ";
    const prompts = {
        "EK3": base + "ESTO ES UN KIT LD. Busca la lista de filtros incluidos (Part Numbers) y el modelo del motor/vehículo.",
        "EK5": base + "ESTO ES UN KIT HD. Extrae detalladamente todos los filtros que vienen en el kit y para qué maquinaria pesada sirve.",
        "ET9": base + "Busca: Micron Rating, Flow Rate (GPM), Thread Size, Gasket OD/ID y Bowl type.",
        "EF9": base + "Busca: Thread Size, Height, Gasket OD, Micron, Media Type.",
        "EL8": base + "Busca: Thread Size, Height, Gasket OD, Gasket ID, Micron, Bypass Valve.",
        "EA1": base + "Busca: Height, Outer Diameter, Inner Diameter, Efficiency %, CFM."
    };
    return prompts[prefix] || base + "Busca todos los atributos técnicos disponibles.";
};

async function runV77(inputCode) {
    console.log(`[V77] ⚙️ Extrayendo ADN para ${inputCode}...`);
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    try {
        await page.goto(`https://shop.donaldson.com/store/es-us/search?Ntt=${inputCode}*`, { waitUntil: 'networkidle2' });
        await page.waitForSelector('.donaldson-part-details', { timeout: 10000 });
        
        const donSku = await page.evaluate(() => document.querySelector('a.donaldson-part-details span')?.innerText.trim());
        const donDesc = await page.evaluate(() => document.querySelector('.donaldson-product-details')?.innerText.trim() || "");
        const productUrl = await page.evaluate(() => document.querySelector('a.donaldson-part-details')?.href);

        // DETERMINAR PREFIJO (Lógica V74/V75 integrada)
        let brand = { p: "EL8", t: "SINTRAX™", sku: "EL8" + donSku.replace(/[^0-9]/g, '') };
        if (donDesc.includes('KIT')) {
            const isLD = donDesc.includes('LIGHT') || donDesc.includes(' LD');
            brand = { p: isLD ? "EK3" : "EK5", t: "DURATEC™", sku: (isLD ? "EK3" : "EK5") + donSku.slice(-4) };
        } else if (donDesc.includes('TURBINE')) {
            brand = { p: "ET9", t: "TURBINE SERIES", sku: "ET9" + donSku.replace(/[^0-9]/g, '') };
        } else if (donDesc.includes('FUEL')) {
            brand = { p: "EF9", t: "SYNTEPORE™", sku: "EF9" + donSku.replace(/[^0-9]/g, '') };
        }

        await page.goto(productUrl, { waitUntil: 'networkidle2' });
        await page.evaluate(() => {
            document.querySelector('a[data-target=".prodSpecInfoDiv"]')?.click();
            document.querySelector('a[data-target=".ListEquipmentDetailPageComp"]')?.click();
        });
        await new Promise(r => setTimeout(r, 2000));

        const rawBody = await page.evaluate(() => document.body.innerText);
        const specificPrompt = getSpecPrompt(brand.p);

        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: specificPrompt },
                { role: "user", content: `Analiza este texto técnico: ${rawBody.substring(0, 12000)}` }
            ]
        }, { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY.trim()}` } });

        const d = JSON.parse(response.data.choices[0].message.content);
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'];

        await sheet.addRow({
            'Input Code': inputCode,
            'ELIMFILTERS SKU': brand.sku,
            'Description': donDesc,
            'Filter Type': d.type || "",
            'Subtype': d.sub || "",
            'Prefix': brand.p,
            'ELIMFILTERS Technology': brand.t,
            'Equipment Filters List': d.kit_contents || "", // Aquí caerá el desglose si es EK
            'OEM Codes': d.oem || "",
            'Cross Reference Codes': d.cross || "",
            'Technical Sheet URL': productUrl
        });

        await browser.close();
        return { status: "SUCCESS", prefix: brand.p, sku: brand.sku };
    } catch (err) {
        if (browser) await browser.close();
        return { status: "ERROR", msg: err.message };
    }
}
app.get('/api/search/:code', async (req, res) => res.json(await runV77(req.params.code)));
app.listen(process.env.PORT || 8080, () => console.log("🚀 V77.00 KITS & TURBINE MASTER ONLINE"));
