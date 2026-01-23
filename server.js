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

const toElimSku = (sku, isKit) => {
    if (!sku) return "";
    let s = sku.replace(/[^a-zA-Z0-9]/g, '');
    if (isKit) return s.replace(/^P/, 'EK');
    if (s.startsWith('P55') || s.startsWith('DBF')) return s.replace(/^(P55|DBF)/, 'EL8');
    return `EL8${s}`;
};

async function runV61(inputCode) {
    console.log(`[V61] 🕵️ Buscando: ${inputCode}`);
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    try {
        // 1. INTENTO DE BÚSQUEDA ROBUSTO
        await page.goto('https://shop.donaldson.com/store/es-us/home', { waitUntil: 'networkidle2' });
        
        // Esperamos por el buscador con múltiples selectores posibles
        const searchSelector = 'input[name="Ntt"], #searchBox, .search-query';
        try {
            await page.waitForSelector(searchSelector, { visible: true, timeout: 10000 });
            await page.type(searchSelector, inputCode);
            await page.keyboard.press('Enter');
        } catch (e) {
            console.log("⚠️ Home search failed, trying direct search URL...");
            await page.goto(`https://shop.donaldson.com/store/es-us/search?Ntt=${inputCode}*`, { waitUntil: 'networkidle2' });
        }

        // 2. IDENTIFICAR EL PRODUCTO REAL
        await page.waitForSelector('.donaldson-part-details', { timeout: 15000 });
        const productUrl = await page.evaluate(() => document.querySelector('a.donaldson-part-details')?.href);
        if (!productUrl) throw new Error("Producto no encontrado en la lista");
        await page.goto(productUrl, { waitUntil: 'networkidle2' });

        // 3. ATRIBUTOS Y REFERENCIAS
        await page.evaluate(() => {
            document.querySelector('a[data-target=".prodSpecInfoDiv"]')?.click();
            document.querySelector('a[data-target=".ListCrossReferenceDetailPageComp"]')?.click();
            document.querySelector('a[data-target=".ListEquipmentDetailPageComp"]')?.click();
        });
        await new Promise(r => setTimeout(r, 2000));

        // Expandir "Mostrar más" en Atributos y Referencias
        await page.evaluate(() => {
            document.querySelector('#showMoreProductSpecsButton')?.click();
            document.querySelector('#showAllCrossReferenceListButton')?.click();
        });

        // 4. DEEP LINK: FILTROS DEL EQUIPO
        const deepLinkData = await page.evaluate(() => {
            const row = document.querySelector('.ListEquipmentDetailPageComp table tbody tr');
            return row ? { name: row.innerText.split('\t')[0].trim(), url: row.querySelector('a')?.href } : null;
        });

        let eqFilters = "";
        if (deepLinkData && deepLinkData.url) {
            const p2 = await browser.newPage();
            await p2.goto(deepLinkData.url, { waitUntil: 'networkidle2' });
            const list = await p2.evaluate(() => 
                Array.from(document.querySelectorAll('.donaldson-part-details span:first-child')).map(s => s.innerText.trim())
            );
            eqFilters = `${deepLinkData.name}: [${list.join(' | ')}]`;
            await p2.close();
        }

        // 5. IA PARA CLASIFICACIÓN AJ/AK Y SPECS
        const rawBody = await page.evaluate(() => document.body.innerText);
        const alternates = await page.evaluate(() => 
            Array.from(document.querySelectorAll('.comapreProdListSection .donaldson-part-details span:first-child')).map(i => i.innerText.trim())
        );

        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" },
            messages: [{ role: "system", content: "Extrae JSON: desc, oem, cross, kits, specs {thread, height_mm, micron}." }, { role: "user", content: rawBody.substring(0, 18000) }]
        }, { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY.trim()}` } });

        const d = JSON.parse(response.data.choices[0].message.content);
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'];

        // 6. CARGA FINAL
        await sheet.addRow({
            'Input Code': inputCode,
            'ELIMFILTERS SKU': toElimSku(inputCode, false),
            'Description': d.desc || "",
            'Thread Size': d.specs?.thread || "",
            'Height (mm)': d.specs?.height_mm || "",
            'Micron Rating': d.specs?.micron || "",
            'OEM Codes': Array.isArray(d.oem) ? d.oem.join(', ') : d.oem,
            'Cross Reference Codes': Array.isArray(d.cross) ? d.cross.join(', ') : d.cross,
            'Equipment Applications': deepLinkData?.name || "",
            'Alternative Products': alternates.join(', '),
            'Equipment Filters List': eqFilters,
            'Technical Sheet URL': productUrl
        });

        await browser.close();
        return { status: "EXITO_V61", sku: inputCode };
    } catch (err) {
        if (browser) await browser.close();
        console.error(err);
        return { status: "ERROR", msg: err.message };
    }
}
app.get('/api/search/:code', async (req, res) => res.json(await runV61(req.params.code)));
app.listen(process.env.PORT || 8080, () => console.log("🚀 V61.00 INFALLIBLE SEARCH ONLINE"));
