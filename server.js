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

// 🧬 DICCIONARIO MAESTRO DE IDENTIDAD ELIMFILTERS
const ELIM_CORE = {
    "EA1": { tech: "MACROCORE™", sys: "engine air intake" },
    "EA2": { tech: "INTEKCORE™", sys: "air intake system" },
    "EC1": { tech: "MICROKAPPA™", sys: "cabin environment" },
    "ED4": { tech: "DRYCORE™", sys: "air brake system" },
    "EF9": { tech: "SYNTEPORE™", sys: "fuel system" },
    "ES9": { tech: "FUEL AQUAGUARD", sys: "fuel/water separation" },
    "EH6": { tech: "NANOFORCE", sys: "hydraulic system" },
    "EL8": { tech: "SINTRAX™", sys: "lubrication system" },
    "EM9": { tech: "MARINEGUARD", sys: "marine engine" },
    "ET9": { tech: "TURBINE SERIES", sys: "turbine fuel system" },
    "EK3": { tech: "DURATECH™", sys: "maintenance kit" },
    "EK5": { tech: "DURATECH™", sys: "heavy-duty maintenance kit" }
};

const getBranding = (donSku, donDesc, input) => {
    const s = donSku.toUpperCase();
    const d = donDesc.toUpperCase();
    const inp = input.toUpperCase();
    const digits = s.replace(/[^0-9]/g, '');
    let p = "EL8", duty = "LD";

    // Lógica ET9 (Turbinas)
    if (s.match(/2020|2040|2010/) || d.includes('TURBINE')) {
        let suf = (inp.includes('PM')||s.includes('PM')) ? "P" : (inp.includes('TM')||s.includes('TM')) ? "T" : (inp.includes('SM')||s.includes('SM')) ? "S" : "";
        return { p: "ET9", sku: "ET9" + (s.match(/2020|2040|2010/)?.[0] || digits.slice(-4)) + suf, duty: "HD" };
    }
    // Lógica Kits
    if (s.startsWith('P559') || d.includes('KIT')) {
        duty = (d.includes('CAT') || d.includes('KOMATSU') || d.includes('HEAVY')) ? "HD" : "LD";
        p = duty === "HD" ? "EK5" : "EK3";
        return { p, sku: p + digits.slice(-4), duty };
    }
    // Clasificación General
    if (d.includes('AIR')) p = "EA1";
    else if (d.includes('CABIN')) p = "EC1";
    else if (d.includes('FUEL') && d.includes('WATER')) p = "ES9";
    else if (d.includes('FUEL')) p = "EF9";
    else if (d.includes('HYDRAULIC')) p = "EH6";
    
    duty = (d.includes('CAT') || d.includes('VOLVO') || d.includes('CUMMINS') || d.includes('INDUSTRIAL')) ? "HD" : "LD";
    return { p, sku: p + digits, duty };
};

const clean = (v) => (!v || v === "N/A" || typeof v === 'object') ? "" : String(v).trim();

async function runMaster(inputCode) {
    console.log(`[MASTER] 🏁 Procesando: ${inputCode}`);
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    try {
        await page.goto(`https://shop.donaldson.com/store/es-us/search?Ntt=${inputCode}*`, { waitUntil: 'networkidle2' });
        await page.waitForSelector('.donaldson-part-details', { timeout: 10000 });
        const donSku = await page.evaluate(() => document.querySelector('a.donaldson-part-details span')?.innerText.trim());
        const donDesc = await page.evaluate(() => document.querySelector('.donaldson-product-details')?.innerText.trim() || "");
        const productUrl = await page.evaluate(() => document.querySelector('a.donaldson-part-details')?.href);

        const b = getBranding(donSku, donDesc, inputCode);
        const config = ELIM_CORE[b.p];

        await page.goto(productUrl, { waitUntil: 'networkidle2' });
        await page.evaluate(() => {
            document.querySelectorAll('a[data-toggle="collapse"]').forEach(a => a.click());
        });
        await new Promise(r => setTimeout(r, 2500));
        const rawBody = await page.evaluate(() => document.body.innerText);

        // 🧠 IA: EL CEREBRO DE CLASIFICACIÓN
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" },
            messages: [{
                role: "system",
                content: `Extrae información técnica exacta para 39 columnas. 
                - OEM Codes: Solo números de marcas de equipos (CAT, Volvo, etc). Separados por coma.
                - Cross Reference: Solo números de marcas de filtros (Baldwin, Fleetguard, Wix). Separados por coma.
                - Engine Apps: Modelos de motor.
                - Equipment Year: Rango de años.
                - Alternative Products: 3 SKUs ELIMFILTERS (Prefijo + número) sugeridos.`
            }, { role: "user", content: `Analiza este texto y genera el JSON: ${rawBody.substring(0, 15000)}` }]
        }, { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY.trim()}` } });

        const d = JSON.parse(response.data.choices[0].message.content);
        
        // NARRATIVA DE MARKETING (COLUMNA C)
        const descMarketing = `Elimfilters® ${b.sku} ${clean(d.subtype).toLowerCase()} ${clean(d.type).toLowerCase()} delivers superior performance using proven media technology. ${config.tech} armadura sintética, combustible 100% al motor. Ensures optimal ${config.sys} protection to meet or exceed OEM specifications.`;

        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'];
        await sheet.addRow([
            inputCode, b.sku, descMarketing, clean(d.type), clean(d.subtype), 
            clean(d.install_type), b.p, config.tech, b.duty, clean(d.thread),
            clean(d.h_mm), clean(d.h_in), clean(d.od_mm), clean(d.od_in), clean(d.id_mm),
            clean(d.g_od_mm), clean(d.g_od_in), clean(d.g_id_mm), clean(d.g_id_in),
            clean(d.iso), clean(d.micron), clean(d.beta), clean(d.efficiency),
            clean(d.pressure), clean(d.flow_l), clean(d.flow_gpm), clean(d.flow_cfm),
            clean(d.burst), clean(d.collapse), clean(d.bypass), clean(d.press_valve),
            clean(d.anti_drain), clean(d.special), clean(d.oem), clean(d.cross),
            clean(d.equip_apps), clean(d.alternatives), clean(d.engines), clean(d.years)
        ]);

        await browser.close();
        return { status: "SUCCESS", sku: b.sku };
    } catch (err) {
        if (browser) await browser.close();
        return { status: "ERROR", msg: err.message };
    }
}
app.get('/api/search/:code', async (req, res) => res.json(await runMaster(req.params.code)));
app.listen(process.env.PORT || 8080, () => console.log("🚀 MASTER V88.00 ONLINE"));
