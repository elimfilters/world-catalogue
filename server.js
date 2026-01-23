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

async function runV45(sku) {
    console.log(`[V45] 🎯 Extracción Quirúrgica para: ${sku}`);
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

        // RUTINA DE EXPANSIÓN (Igual que V44 pero con limpieza posterior)
        await page.evaluate(async () => {
            const clickAll = async (txt) => {
                const btns = Array.from(document.querySelectorAll('a, button')).filter(el => el.innerText.toUpperCase().includes(txt));
                for (let b of btns) { b.click(); await new Promise(r => setTimeout(r, 1000)); }
            };
            await clickAll('MOSTRAR MÁS');
            const tab = Array.from(document.querySelectorAll('.nav-tabs a')).find(el => el.innerText.toUpperCase().includes('EQUIPO'));
            if (tab) { tab.click(); await new Promise(r => setTimeout(r, 2000)); await clickAll('MOSTRAR MÁS'); }
        });

        // LIMPIEZA QUIRÚRGICA: Solo agarramos las áreas de datos
        const cleanData = await page.evaluate(() => {
            const specs = document.querySelector('.product-specifications')?.innerText || "";
            const crosses = document.querySelector('.ListCrossReferenceDetailPageComp')?.innerText || "";
            const equip = document.querySelector('.tab-content')?.innerText || "";
            return (specs + " " + crosses + " " + equip).replace(/\s\s+/g, ' ').substring(0, 12000);
        });
        
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: "Extrae JSON: oem_codes, cross_ref_codes, equipment_apps, desc, thread, h_mm, od_mm. Sé exhaustivo con los códigos." },
                { role: "user", content: `Datos del filtro ${sku}: ${cleanData}` }
            ]
        }, { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY.trim()}` } });

        const d = JSON.parse(response.data.choices[0].message.content);
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'];
        
        await sheet.addRow({
            'Input Code': sku,
            'Description': flatten(d.desc),
            'OEM Codes': flatten(d.oem_codes),
            'Cross Reference Codes': flatten(d.cross_ref_codes),
            'Equipment Applications': flatten(d.equipment_apps),
            'Thread Size': flatten(d.thread),
            'Height (mm)': flatten(d.h_mm),
            'Outer Diameter (mm)': flatten(d.od_mm),
            'Technical Sheet URL': productUrl,
            'Audit Status': `V45_CLEAN_SUCCESS_${new Date().toLocaleTimeString()}`
        });

        await browser.close();
        return { sku, status: "EXITO" };

    } catch (err) {
        if (browser) await browser.close();
        return { sku, status: "ERROR", msg: err.message };
    }
}

app.get('/api/search/:code', async (req, res) => {
    const result = await runV45(req.params.code.toUpperCase());
    res.json(result);
});

app.listen(process.env.PORT || 8080, () => console.log("🚀 V45.00 SURGEON ONLINE"));
