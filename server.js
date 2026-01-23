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

const flatten = (val) => Array.isArray(val) ? val.join(', ') : (val || "N/A");

async function runV43(sku) {
    console.log(`[V43] 📡 Escaneo Exhaustivo de Columnas para: ${sku}`);
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
                    content: `Eres un ingeniero experto en filtros. Extrae CADA detalle técnico. 
                    Mapea a estas llaves JSON: 
                    desc, type, subtype, thread, h_mm, h_in, od_mm, od_in, id_mm, god_mm, god_in, gid_mm, gid_in, 
                    iso_std, micron, beta, efficiency, flow_lpm, flow_gpm, flow_cfm, p_max, p_burst, p_collapse, p_bypass, 
                    p_valve, media, anti_drain, tech, features, oem, cross, equip, engine. 
                    Diferencia bien OEM (marcas de máquinas) de Cross Reference (marcas de filtros).` 
                },
                { role: "user", content: `Analiza este texto y llena todos los campos para el filtro ${sku}: ${bodyText}` }
            ]
        }, { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY.trim()}` } });

        const d = JSON.parse(response.data.choices[0].message.content);
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'];
        
        await sheet.addRow({
            'Input Code': sku,
            'Description': flatten(d.desc),
            'Filter Type': flatten(d.type),
            'Subtype': flatten(d.subtype),
            'Thread Size': flatten(d.thread),
            'Height (mm)': flatten(d.h_mm),
            'Height (inch)': flatten(d.h_in),
            'Outer Diameter (mm)': flatten(d.od_mm),
            'Outer Diameter (inch)': flatten(d.od_in),
            'Inner Diameter (mm)': flatten(d.id_mm),
            'Gasket OD (mm)': flatten(d.god_mm),
            'Gasket OD (inch)': flatten(d.god_in),
            'Gasket ID (mm)': flatten(d.gid_mm),
            'Gasket ID (inch)': flatten(d.gid_in),
            'ISO Test Method': flatten(d.iso_std),
            'Micron Rating': flatten(d.micron),
            'Beta Ratio': flatten(d.beta),
            'Nominal Efficiency (%)': flatten(d.efficiency),
            'Rated Flow (L/min)': flatten(d.flow_lpm),
            'Rated Flow (GPM)': flatten(d.flow_gpm),
            'Max Pressure (PSI)': flatten(d.p_max),
            'Burst Pressure (PSI)': flatten(d.p_burst),
            'Collapse Pressure (PSI)': flatten(d.p_collapse),
            'Bypass Valve Pressure (PSI)': flatten(d.p_bypass),
            'Pressure Valve': flatten(d.p_valve),
            'Media Type': flatten(d.media),
            'Anti-Drainback Valve': flatten(d.anti_drain),
            'Filtration Technology': flatten(d.tech),
            'Special Features': flatten(d.features),
            'OEM Codes': flatten(d.oem),
            'Cross Reference Codes': flatten(d.cross),
            'Equipment Applications': flatten(d.equip),
            'Engine Applications': flatten(d.engine),
            'Technical Sheet URL': productUrl,
            'Audit Status': `V43_FULL_SCAN_${new Date().toLocaleTimeString()}`
        });

        await browser.close();
        return { sku, status: "EXITO" };

    } catch (err) {
        if (browser) await browser.close();
        return { sku, status: "ERROR", msg: err.message };
    }
}

app.get('/api/search/:code', async (req, res) => {
    const result = await runV43(req.params.code.toUpperCase());
    res.json(result);
});

app.listen(process.env.PORT || 8080);
