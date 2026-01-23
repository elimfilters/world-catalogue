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

async function runV44(sku) {
    console.log(`[V44] 🦾 Forzando clics en tablas dinámicas para: ${sku}`);
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

        // --- RUTINA DE CLICS AGRESIVA ---
        await page.evaluate(async () => {
            const clickAll = async (selectorText) => {
                let found = true;
                while (found) {
                    const btn = Array.from(document.querySelectorAll('a, button, .show-more')).find(el => 
                        el.innerText.toUpperCase().includes(selectorText)
                    );
                    if (btn && btn.offsetParent !== null) {
                        btn.click();
                        await new Promise(r => setTimeout(r, 1500));
                    } else {
                        found = false;
                    }
                }
            };

            // Expandir Referencias Cruzadas
            await clickAll('MOSTRAR MÁS');

            // Ir a pestaña de Equipos y expandir
            const tab = Array.from(document.querySelectorAll('.nav-tabs a, .nav-item')).find(el => 
                el.innerText.toUpperCase().includes('EQUIPO') || el.innerText.toUpperCase().includes('EQUIPMENT')
            );
            if (tab) {
                tab.click();
                await new Promise(r => setTimeout(r, 2000));
                await clickAll('MOSTRAR MÁS');
            }
        });

        const bodyText = await page.evaluate(() => document.body.innerText.replace(/\s\s+/g, ' ').substring(0, 25000));
        
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" },
            messages: [
                { 
                    role: "system", 
                    content: `Analiza TODO el texto. Extrae listas completas de OEM_CODES (marcas de maquinaria), CROSS_REF (marcas filtros) y EQUIPMENT_APPS. No resumas, sepáralos por comas.` 
                },
                { role: "user", content: `Filtro ${sku}: ${bodyText}` }
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
            'Technical Sheet URL': productUrl,
            'Audit Status': `V44_FINAL_SUCCESS_${new Date().toLocaleTimeString()}`
        });

        await browser.close();
        return { sku, status: "EXITO" };

    } catch (err) {
        if (browser) await browser.close();
        return { sku, status: "ERROR", msg: err.message };
    }
}

app.get('/api/search/:code', async (req, res) => {
    const result = await runV44(req.params.code.toUpperCase());
    res.json(result);
});

app.listen(process.env.PORT || 8080, () => console.log("🚀 V44.00 READY"));
