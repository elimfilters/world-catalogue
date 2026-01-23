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

async function runV33(sku) {
    console.log(`[V33] 🧐 Extracción profunda para: ${sku}`);
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    
    try {
        await page.goto(`https://shop.donaldson.com/store/es-us/search?Ntt=${sku}*`, { waitUntil: 'networkidle2' });
        
        const productUrl = await page.evaluate(() => {
            const link = document.querySelector('a.donaldson-part-details') || document.querySelector('a[href*="/product/"]');
            return link ? link.href : null;
        });

        if (!productUrl) throw new Error("No URL");

        await page.goto(productUrl, { waitUntil: 'networkidle2' });
        
        // ESPERA CRÍTICA: Damos tiempo a que las tablas de JavaScript se pinten
        await new Promise(r => setTimeout(r, 6000)); 

        const bodyText = await page.evaluate(() => document.body.innerText);
        
        // IA con el Prompt Refinado
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: "llama3-8b-8192",
            messages: [
                { role: "system", content: "Busca 'Thread Size' o 'Rosca'. Responde SOLO el valor. Si no hay, N/A." },
                { role: "user", content: `Texto: ${bodyText.substring(0, 6000)}` }
            ]
        }, { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` } });

        const thread = response.data.choices[0].message.content.trim();
        console.log(`✅ Resultado Final: ${thread}`);

        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'];
        await sheet.addRow({
            'Input Code': sku,
            'Thread Size': thread,
            'Audit Status': `V33_FINAL_${new Date().toLocaleTimeString()}`
        });

        await browser.close();
        return { sku, thread, status: "EXITO" };

    } catch (err) {
        await browser.close();
        return { sku, status: "ERROR", msg: err.message };
    }
}

app.get('/api/search/:code', async (req, res) => {
    const result = await runV33(req.params.code.toUpperCase());
    res.json(result);
});

app.listen(process.env.PORT || 8080);
