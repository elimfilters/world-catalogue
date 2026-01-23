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

async function runV60(inputCode) {
    console.log(`[V60] 🏭 Iniciando búsqueda profunda: ${inputCode}`);
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    try {
        await page.goto('https://shop.donaldson.com/store/es-us/home', { waitUntil: 'networkidle2' });
        await page.type('input[name="Ntt"]', inputCode);
        await page.keyboard.press('Enter');
        await page.waitForSelector('.donaldson-part-details', { timeout: 15000 });
        const productUrl = await page.evaluate(() => document.querySelector('a.donaldson-part-details')?.href);
        await page.goto(productUrl, { waitUntil: 'networkidle2' });

        // 1. EXTRAER ALTERNATIVOS
        const alternates = await page.evaluate(() => 
            Array.from(document.querySelectorAll('.comapreProdListSection .donaldson-part-details span:first-child')).map(i => i.innerText.trim())
        );

        // 2. EXTRAER ATRIBUTOS
        await page.evaluate(() => {
            document.querySelector('a[data-target=".prodSpecInfoDiv"]')?.click();
            setTimeout(() => document.querySelector('#showMoreProductSpecsButton')?.click(), 1000);
        });
        await new Promise(r => setTimeout(r, 2000));

        // 3. EXTRAER REFERENCIAS (AJ/AK)
        await page.evaluate(() => document.querySelector('a[data-target=".ListCrossReferenceDetailPageComp"]')?.click());
        await new Promise(r => setTimeout(r, 1500));
        let moreRefs = true;
        while (moreRefs) {
            moreRefs = await page.evaluate(() => {
                const b = document.querySelector('#showAllCrossReferenceListButton');
                if (b && b.style.display !== 'none') { b.click(); return true; }
                return false;
            });
            if (moreRefs) await new Promise(r => setTimeout(r, 1000));
        }

        // 4. DEEP LINK: EQUIPOS Y SUS FILTROS
        console.log("🚜 Navegando en equipos para extraer listas de filtros...");
        await page.evaluate(() => document.querySelector('a[data-target=".ListEquipmentDetailPageComp"]')?.click());
        await new Promise(r => setTimeout(r, 1000));
        const deepLinks = await page.evaluate(() => 
            Array.from(document.querySelectorAll('.ListEquipmentDetailPageComp table tbody tr'))
                .slice(0, 3) 
                .map(row => ({ name: row.innerText.split('\t')[0].trim(), url: row.querySelector('a')?.href }))
        );

        let equipmentFilters = [];
        for (let linkObj of deepLinks) {
            if (linkObj.url) {
                const p2 = await browser.newPage();
                await p2.goto(linkObj.url, { waitUntil: 'networkidle2' });
                const f = await p2.evaluate(() => Array.from(document.querySelectorAll('.donaldson-part-details span:first-child')).map(s => s.innerText.trim()));
                equipmentFilters.push(`${linkObj.name}: [${f.join(' | ')}]`);
                await p2.close();
            }
        }

        const rawBody = await page.evaluate(() => document.body.innerText);
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" },
            messages: [{ role: "system", content: "Extrae JSON: desc, kits, oem, cross, specs." }, { role: "user", content: rawBody.substring(0, 18000) }]
        }, { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY.trim()}` } });

        const d = JSON.parse(response.data.choices[0].message.content);
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'];

        await sheet.addRow({
            'Input Code': inputCode,
            'ELIMFILTERS SKU': toElimSku(inputCode, false),
            'Description': d.desc,
            'OEM Codes': Array.isArray(d.oem) ? d.oem.join(', ') : d.oem,
            'Cross Reference Codes': Array.isArray(d.cross) ? d.cross.join(', ') : d.cross,
            'Equipment Applications': deepLinks.map(l => l.name).join(', '),
            'Alternative Products': alternates.join(', '),
            'Equipment Filters List': equipmentFilters.join(' || '),
            'Technical Sheet URL': productUrl
        });

        await browser.close();
        return { status: "EXITO_V60", code: inputCode };
    } catch (err) {
        if (browser) await browser.close();
        return { status: "ERROR", msg: err.message };
    }
}
app.get('/api/search/:code', async (req, res) => res.json(await runV60(req.params.code)));
app.listen(process.env.PORT || 8080, () => console.log("🚀 V60.00 FINAL MASTER ONLINE"));
