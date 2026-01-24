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

// 🧬 NÚCLEO DE IDENTIDAD Y SEGMENTACIÓN
const ELIM_CORE = {
    "EA1": { tech: "MACROCORE™", sys: "engine air intake", sheet: "MASTER_INDIVIDUAL" },
    "EF9": { tech: "SYNTEPORE™", sys: "fuel system", sheet: "MASTER_INDIVIDUAL" },
    "ES9": { tech: "FUEL AQUAGUARD", sys: "fuel/water separation", sheet: "MASTER_INDIVIDUAL" },
    "EL8": { tech: "SINTRAX™", sys: "lubrication system", sheet: "MASTER_INDIVIDUAL" },
    "ET9": { tech: "TURBINE SERIES", sys: "turbine fuel system", sheet: "MASTER_INDIVIDUAL" },
    "EK3": { tech: "DURATECH™", sys: "maintenance kit", sheet: "MASTER_KITS" },
    "EK5": { tech: "DURATECH™", sys: "heavy-duty maintenance kit", sheet: "MASTER_KITS" }
};

const getBranding = (donSku, donDesc, input) => {
    const s = donSku.toUpperCase();
    const d = donDesc.toUpperCase();
    const inp = input.toUpperCase();
    const digits = s.replace(/[^0-9]/g, '');
    
    // CASO KITS (EK3/EK5)
    if (s.startsWith('P559') || d.includes('KIT')) {
        const isHD = (d.includes('CAT') || d.includes('VOLVO') || d.includes('CUMMINS') || d.includes('HEAVY'));
        const p = isHD ? "EK5" : "EK3";
        return { p, sku: p + digits.slice(-4), duty: isHD ? "HD" : "LD" };
    }
    // CASO TURBINAS (ET9)
    if (s.match(/2020|2040|2010/) || d.includes('TURBINE')) {
        let suf = (inp.includes('PM')||s.includes('PM')) ? "P" : (inp.includes('TM')||s.includes('TM')) ? "T" : (inp.includes('SM')||s.includes('SM')) ? "S" : "";
        return { p: "ET9", sku: "ET9" + (s.match(/2020|2040|2010/)?.[0] || digits.slice(-4)) + suf, duty: "HD" };
    }
    // CASO INDIVIDUALES
    let p = "EL8";
    if (d.includes('AIR')) p = "EA1";
    else if (d.includes('FUEL') && d.includes('WATER')) p = "ES9";
    else if (d.includes('FUEL')) p = "EF9";
    
    const isHD = (d.includes('CAT') || d.includes('VOLVO') || d.includes('KOMATSU') || d.includes('INDUSTRIAL'));
    return { p, sku: p + digits, duty: isHD ? "HD" : "LD" };
};

async function runMaster(inputCode) {
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    try {
        await page.goto(`https://shop.donaldson.com/store/es-us/search?Ntt=${inputCode}*`, { waitUntil: 'networkidle2' });
        await page.waitForSelector('.donaldson-part-details');
        
        const donSku = await page.evaluate(() => document.querySelector('a.donaldson-part-details span')?.innerText.trim());
        const donDesc = await page.evaluate(() => document.querySelector('.donaldson-product-details')?.innerText.trim() || "");
        const productUrl = await page.evaluate(() => document.querySelector('a.donaldson-part-details')?.href);

        const b = getBranding(donSku, donDesc, inputCode);
        const config = ELIM_CORE[b.p] || ELIM_CORE["EL8"];

        await page.goto(productUrl, { waitUntil: 'networkidle2' });
        const rawBody = await page.evaluate(() => document.body.innerText);

        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" },
            messages: [{
                role: "system",
                content: `Extrae JSON para 39 columnas. 
                - OEM Codes: Solo números, sin marcas, separados por coma.
                - Cross Reference: Solo números de filtros competencia, sin marcas, separados por coma.
                - Engine Apps: Modelos de motor.
                - Equipment Year: Rango de años.
                - Alternative Products: 3 SKUs ELIMFILTERS sugeridos.`
            }, { role: "user", content: rawBody.substring(0, 15000) }]
        }, { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY.trim()}` } });

        const d = JSON.parse(response.data.choices[0].message.content);
        const mDesc = `Elimfilters® ${b.sku} delivers superior performance. ${config.tech} armadura sintética, combustible 100% al motor. Meets or exceeds OEM specifications.`;

        await doc.loadInfo();
        const targetSheet = doc.sheetsByTitle[config.sheet]; // AQUÍ SE DECIDE LA HOJA
        
        await targetSheet.addRow([
            inputCode, b.sku, mDesc, d.type, d.subtype, d.install, b.p, config.tech, b.duty,
            d.thread, d.h_mm, d.h_in, d.od_mm, d.od_in, d.id_mm, d.g_od_mm, d.g_od_in,
            d.g_id_mm, d.g_id_in, d.iso, d.micron, d.beta, d.efficiency, d.pressure,
            d.flow_l, d.flow_gpm, d.flow_cfm, d.burst, d.collapse, d.bypass, d.press_valve,
            d.anti_drain || "No", d.special || "HPCR Protection", d.oem, d.cross,
            d.equip_apps, d.alternatives, d.engines, d.years
        ]);

        await browser.close();
        return { status: "SUCCESS", sheet: config.sheet, sku: b.sku };
    } catch (err) {
        if (browser) await browser.close();
        return { status: "ERROR", msg: err.message };
    }
}
app.get('/api/search/:code', async (req, res) => res.json(await runMaster(req.params.code)));
app.listen(process.env.PORT || 8080, () => console.log("🚀 V89.00 MASTER PRODUCTION READY"));
