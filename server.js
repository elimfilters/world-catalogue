const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

puppeteer.use(StealthPlugin());
const app = express();
app.use(express.json());

const auth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});
const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);

async function processSku(sku) {
    try {
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'];
        const rows = await sheet.getRows();
        const existingRow = rows.find(r => r.get('Input Code') === sku);

        // 1. AHORRO: Si ya tiene rosca, no gastamos recursos
        if (existingRow && existingRow.get('Thread Size') && existingRow.get('Thread Size') !== 'N/A') {
            console.log(`[V29] ✅ ${sku} ya existe. Saltando...`);
            return { sku, status: "EXISTENTE", thread: existingRow.get('Thread Size') };
        }

        console.log(`[V29] 👤 Buscando ${sku} en modo humano...`);
        const browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        await page.goto(`https://shop.donaldson.com/store/es-us/search?Ntt=${sku}*`, { waitUntil: 'networkidle2' });
        
        try {
            await page.waitForSelector('a.donaldson-part-details', { timeout: 10000 });
            await page.click('a.donaldson-part-details');
            await page.waitForSelector("a[data-target='.prodSpecInfoDiv']", { timeout: 10000 });
            await page.click("a[data-target='.prodSpecInfoDiv']");
            
            try {
                await page.waitForSelector("#showMoreProductSpecsButton", { timeout: 4000 });
                await page.click("#showMoreProductSpecsButton");
            } catch (e) {}

            await new Promise(r => setTimeout(r, 2000));

            const data = await page.evaluate(() => {
                const getVal = (text) => {
                    const td = Array.from(document.querySelectorAll('td')).find(el => el.innerText.includes(text));
                    return td ? td.nextElementSibling.innerText.trim() : "N/A";
                };
                return {
                    title: document.querySelector('h1')?.innerText.trim() || "Filtro Detectado",
                    thread: getVal("Thread Size"),
                    od: getVal("Outer Diameter")
                };
            });

            // 2. GUARDAR/ACTUALIZAR
            if (existingRow) {
                existingRow.set('Description', data.title);
                existingRow.set('Thread Size', data.thread);
                existingRow.set('Audit Status', `V29_AUTO_${new Date().toLocaleDateString()}`);
                await existingRow.save();
            } else {
                await sheet.addRow({
                    'Input Code': sku,
                    'Description': data.title,
                    'Thread Size': data.thread,
                    'Audit Status': `V29_NEW_${new Date().toLocaleDateString()}`
                });
            }

            await browser.close();
            return { sku, status: "EXITO", thread: data.thread };

        } catch (error) {
            await browser.close();
            console.log(`[V29] ❌ ${sku} no hallado en web.`);
            return { sku, status: "NOT_FOUND" };
        }

    } catch (err) {
        console.error("❌ ERROR:", err.message);
        return { error: err.message };
    }
}

app.get('/api/search/:code', async (req, res) => {
    const result = await processSku(req.params.code.toUpperCase());
    res.json(result);
});

app.listen(process.env.PORT || 8080, () => console.log("🚀 V29.00 MOTOR LISTO"));
