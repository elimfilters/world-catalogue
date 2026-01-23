const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

puppeteer.use(StealthPlugin());
const app = express();

const auth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});
const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);

async function processSkuWithLogic(sku) {
    console.log(`[V28] 🛡️ Validando lógica para: ${sku}`);
    try {
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'];
        const rows = await sheet.getRows();

        // 1. APLICAR LÓGICA DE CONVERSACIÓN: ¿Ya lo tenemos procesado?
        const existingRow = rows.find(r => r.get('Input Code') === sku);
        
        if (existingRow) {
            const currentThread = existingRow.get('Thread Size');
            if (currentThread && currentThread !== 'N/A' && currentThread !== '') {
                console.log(`[V28] ✅ SKU ${sku} ya tiene datos técnicos. Abortando para ahorrar recursos.`);
                return { status: "SKIPPED", message: "Ya existe en Master Sheet.", data: currentThread };
            }
            console.log(`[V28] ⚠️ SKU existe pero con N/A. Re-intentando búsqueda...`);
        }

        // 2. SI NO EXISTE O TIENE N/A: Lanzar el "Disfraz Humano"
        console.log(`[V28] 👤 Iniciando Chrome Stealth para: ${sku}`);
        const browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        await page.goto(`https://shop.donaldson.com/store/es-us/search?Ntt=${sku}*`, { waitUntil: 'networkidle2' });
        
        try {
            await page.waitForSelector('a.donaldson-part-details', { timeout: 8000 });
            await page.click('a.donaldson-part-details');
            
            await page.waitForSelector("a[data-target='.prodSpecInfoDiv']", { timeout: 8000 });
            await page.click("a[data-target='.prodSpecInfoDiv']");
            
            try {
                await page.waitForSelector("#showMoreProductSpecsButton", { timeout: 3000 });
                await page.click("#showMoreProductSpecsButton");
            } catch (e) {}

            await new Promise(r => setTimeout(r, 2000));

            const specs = await page.evaluate(() => {
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

            // 3. ACTUALIZAR O AÑADIR SEGÚN TU LÓGICA
            if (existingRow) {
                existingRow.set('Description', specs.title);
                existingRow.set('Thread Size', specs.thread);
                existingRow.set('Audit Status', `V28_UPDATED_${new Date().toLocaleTimeString()}`);
                await existingRow.save();
            } else {
                await sheet.addRow({
                    'Input Code': sku,
                    'Description': specs.title,
                    'Thread Size': specs.thread,
                    'Audit Status': `V28_NEW_${new Date().toLocaleTimeString()}`
                });
            }

            await browser.close();
            return { status: "SUCCESS", thread: specs.thread };

        } catch (error) {
            await browser.close();
            console.log(`[V28] ❌ No se encontró el producto en Donaldson.`);
            if (!existingRow) {
                await sheet.addRow({ 'Input Code': sku, 'Audit Status': 'V28_NOT_FOUND_ON_WEB' });
            }
            return { status: "NOT_FOUND" };
        }

    } catch (err) {
        console.error("❌ ERROR MAESTRO:", err.message);
        return { status: "ERROR", msg: err.message };
    }
}

app.get('/api/search/:code', async (req, res) => {
    const result = await processSkuWithLogic(req.params.code.toUpperCase());
    res.json(result);
});

app.listen(process.env.PORT || 8080, () => console.log("🚀 V28.00 LÓGICA MAESTRA ONLINE"));
