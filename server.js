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

async function runV35(sku) {
    console.log(`[V35] 🧠 Usando Llama 3.3 Versatile para: ${sku}`);
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
        await new Promise(r => setTimeout(r, 5000)); 

        const cleanText = await page.evaluate(() => {
            return document.body.innerText.replace(/\s\s+/g, ' ').substring(0, 3000);
        });
        
        // ACTUALIZACIÓN DEL MODELO A LLAMA 3.3 70B
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: "Extrae el 'Thread Size'. Responde SOLO el valor (ej: 1-14 UN). Si no hay, N/A." },
                { role: "user", content: cleanText }
            ]
        }, { 
            headers: { 
                'Authorization': `Bearer ${process.env.GROQ_API_KEY.trim()}`,
                'Content-Type': 'application/json'
            } 
        });

        const thread = response.data.choices[0].message.content.trim();
        
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'];
        await sheet.addRow({
            'Input Code': sku,
            'Thread Size': thread,
            'Audit Status': `V35_Llama3.3_SUCCESS_${new Date().toLocaleTimeString()}`
        });

        await browser.close();
        return { sku, thread, status: "EXITO" };

    } catch (err) {
        await browser.close();
        const errorMsg = err.response ? err.response.data.error.message : err.message;
        return { sku, status: "ERROR", msg: errorMsg };
    }
}

app.get('/api/search/:code', async (req, res) => {
    const result = await runV35(req.params.code.toUpperCase());
    res.json(result);
});

app.listen(process.env.PORT || 8080);
