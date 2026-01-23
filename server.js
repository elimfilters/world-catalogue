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

// FUNCIÓN PARA CONSULTAR A GROQ (EL CEREBRO)
async function askGroq(pageContent) {
    try {
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: "llama3-8b-8192",
            messages: [
                { role: "system", content: "Eres un experto en filtros industriales. Extrae solo el 'Thread Size' del texto. Si no lo ves, responde 'N/A'. Solo responde el valor, nada de explicaciones." },
                { role: "user", content: `Del siguiente texto de una web de Donaldson, dime la rosca (Thread Size): ${pageContent.substring(0, 5000)}` }
            ]
        }, {
            headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' }
        });
        return response.data.choices[0].message.content.trim();
    } catch (e) { return "ERROR_AI"; }
}

async function processSkuV30(sku) {
    console.log(`[V30] 🧠 Iniciando IA + Stealth para: ${sku}`);
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    
    try {
        await page.goto(`https://shop.donaldson.com/store/es-us/search?Ntt=${sku}*`, { waitUntil: 'networkidle2' });
        
        // Intentamos encontrar el producto
        const productLink = await page.$('a[href*="/product/"]');
        if (productLink) {
            await productLink.click();
            await page.waitForTimeout(5000); // Esperamos que cargue la ficha
            
            // CAPTURA DE TEXTO CRUDA (Para Groq)
            const bodyText = await page.evaluate(() => document.body.innerText);
            
            // PLAN A: Extracción por Código
            let thread = await page.evaluate(() => {
                const td = Array.from(document.querySelectorAll('td')).find(el => el.innerText.includes('Thread Size'));
                return td ? td.nextElementSibling.innerText.trim() : null;
            });

            // PLAN B: Si el código falla, entra la IA (Groq)
            if (!thread || thread === "N/A") {
                console.log("[V30] 🤖 El código falló. Consultando a Groq...");
                thread = await askGroq(bodyText);
            }

            console.log(`✅ Resultado Final: ${thread}`);
            
            // GUARDAR EN GOOGLE
            await doc.loadInfo();
            const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'];
            await sheet.addRow({
                'Input Code': sku,
                'Thread Size': thread,
                'Audit Status': `V30_AI_CHECKED_${new Date().toLocaleTimeString()}`
            });

            await browser.close();
            return { sku, thread, method: thread.includes("AI") ? "GROQ" : "CSS" };
        } else {
            throw new Error("Producto no visible");
        }
    } catch (err) {
        await browser.close();
        return { sku, status: "NOT_FOUND", error: err.message };
    }
}

app.get('/api/search/:code', async (req, res) => {
    const result = await processSkuV30(req.params.code.toUpperCase());
    res.json(result);
});

app.listen(process.env.PORT || 8080);
