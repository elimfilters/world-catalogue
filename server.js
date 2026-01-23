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

async function runV46(sku) {
    console.log(`[V46] 🦾 Extracción de Fuerza Bruta para: ${sku}`);
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

        // --- RUTINA DE EXPANSIÓN REFORZADA ---
        await page.evaluate(async () => {
            const clickAll = async (txt) => {
                let btns = Array.from(document.querySelectorAll('a, button')).filter(el => el.innerText.toUpperCase().includes(txt));
                for (let b of btns) { 
                    b.click(); 
                    await new Promise(r => setTimeout(r, 2000)); // Espera a que el DOM se actualice
                }
            };
            
            await clickAll('MOSTRAR MÁS');
            const tab = Array.from(document.querySelectorAll('.nav-tabs a')).find(el => el.innerText.toUpperCase().includes('EQUIPO'));
            if (tab) { 
                tab.click(); 
                await new Promise(r => setTimeout(r, 3000)); 
                await clickAll('MOSTRAR MÁS');
            }
        });

        // Captura más amplia pero limpia
        const fullContent = await page.evaluate(() => {
            const main = document.querySelector('.product-detail-page') || document.body;
            return main.innerText.replace(/\s\s+/g, ' ').substring(0, 18000);
        });
        
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: "Eres un extractor de datos técnicos. Tu objetivo es NO omitir ningún código. Si hay 50 códigos de cruce, escribe los 50 separados por comas. JSON keys: oem_codes, cross_ref_codes, equipment_apps, desc, thread, h_mm, od_mm, micron, efficiency." },
                { role: "user", content: `Filtro ${sku}: ${fullContent}` }
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
            'Micron Rating': flatten(d.micron),
            'Nominal Efficiency (%)': flatten(d.efficiency),
            'Technical Sheet URL': productUrl,
            'Audit Status': `V46_FULL_FORCE_${new Date().toLocaleTimeString()}`
        });

        await browser.close();
        return { sku, status: "EXITO" };

    } catch (err) {
        if (browser) await browser.close();
        return { sku, status: "ERROR", msg: err.message };
    }
}

app.get('/api/search/:code', async (req, res) => {
    const result = await runV46(req.params.code.toUpperCase());
    res.json(result);
});

app.listen(process.env.PORT || 8080, () => console.log("🚀 V46.00 FULL FORCE ONLINE"));
