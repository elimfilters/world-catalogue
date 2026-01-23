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

// LIMPIEZA ABSOLUTA DE DATOS
const cleanValue = (v) => {
    if (v === null || v === undefined) return "N/A";
    if (Array.isArray(v)) return v.map(i => (typeof i === 'object' ? JSON.stringify(i) : i)).join(', ');
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v).trim();
};

async function runV48(sku) {
    console.log(`[V48] 🛠️ Ejecutando Mazo de Demolición: ${sku}`);
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    
    try {
        await page.goto(`https://shop.donaldson.com/store/es-us/search?Ntt=${sku}*`, { waitUntil: 'networkidle2', timeout: 60000 });
        const productUrl = await page.evaluate(() => {
            const link = document.querySelector('a.donaldson-part-details') || document.querySelector('a[href*="/product/"]');
            return link ? link.href : null;
        });

        if (!productUrl) throw new Error("SKU_NOT_FOUND");
        await page.goto(productUrl, { waitUntil: 'networkidle2' });

        // --- CARGA TOTAL (SCROLL + CLICS) ---
        await page.evaluate(async () => {
            // Scroll al fondo para activar Lazy Loading
            window.scrollTo(0, document.body.scrollHeight);
            await new Promise(r => setTimeout(r, 2000));
            
            // Clic recursivo en "Mostrar Más"
            const expand = async () => {
                const btns = Array.from(document.querySelectorAll('a, button')).filter(b => b.innerText.includes('MOSTRAR MÁS') || b.innerText.includes('SHOW MORE'));
                for (let b of btns) { b.click(); await new Promise(r => setTimeout(r, 1500)); }
            };
            await expand();

            // Forzar pestaña de Equipo
            const tab = Array.from(document.querySelectorAll('.nav-link, .nav-tabs a')).find(t => t.innerText.includes('EQUIP'));
            if (tab) { tab.click(); await new Promise(r => setTimeout(r, 2000)); await expand(); }
        });

        const fullBodyText = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
        
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" },
            messages: [
                { 
                    role: "system", 
                    content: `Eres un extractor de datos industriales. No resumas NADA. 
                    JSON: desc, h_mm, h_in, od_mm, od_in, id_mm, thread, micron, efficiency, oem_codes, cross_ref, equipment. 
                    - oem_codes: marcas de equipo (CAT, JD, etc).
                    - cross_ref: marcas de filtros (Baldwin, etc).
                    - equipment: modelos de maquinas.` 
                },
                { role: "user", content: `Filtro ${sku}: ${fullBodyText.substring(0, 20000)}` }
            ]
        }, { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY.trim()}` } });

        const d = JSON.parse(response.data.choices[0].message.content);
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'];
        
        await sheet.addRow({
            'Input Code': sku,
            'Description': cleanValue(d.desc),
            'Thread Size': cleanValue(d.thread),
            'Height (mm)': cleanValue(d.h_mm),
            'Height (inch)': cleanValue(d.h_in),
            'Outer Diameter (mm)': cleanValue(d.od_mm),
            'Micron Rating': cleanValue(d.micron),
            'Nominal Efficiency (%)': cleanValue(d.efficiency),
            'OEM Codes': cleanValue(d.oem_codes),
            'Cross Reference Codes': cleanValue(d.cross_ref),
            'Equipment Applications': cleanValue(d.equipment),
            'Technical Sheet URL': productUrl,
            'Audit Status': `V48_FIX_FINAL_${new Date().toLocaleTimeString()}`
        });

        await browser.close();
        return { sku, status: "EXITO" };

    } catch (err) {
        if (browser) await browser.close();
        return { sku, status: "ERROR", msg: err.message };
    }
}

app.get('/api/search/:code', async (req, res) => {
    const result = await runV48(req.params.code.toUpperCase());
    res.json(result);
});

app.listen(process.env.PORT || 8080);
