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

const toElimSku = (sku) => {
    if (!sku) return "";
    let s = sku.replace(/[^a-zA-Z0-9]/g, '');
    if (s.startsWith('P55') || s.startsWith('DBF')) return s.replace(/^(P55|DBF)/, 'EL8');
    return `EL8${s}`;
};

// LIMPIADOR DEFINITIVO DE OBJETOS
const forceString = (val) => {
    if (val === null || val === undefined) return "";
    if (Array.isArray(val)) return val.map(forceString).join(', ');
    if (typeof val === 'object') return Object.values(val).map(forceString).join(' ');
    return String(val).trim();
};

async function runV63(inputCode) {
    console.log(`[V63] 🏷️ Clasificando Tipo y Subtipo para: ${inputCode}`);
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    try {
        await page.goto(`https://shop.donaldson.com/store/es-us/search?Ntt=${inputCode}*`, { waitUntil: 'networkidle2' });
        await page.waitForSelector('.donaldson-part-details', { timeout: 10000 });
        const productUrl = await page.evaluate(() => document.querySelector('a.donaldson-part-details')?.href);
        const donaldsonSku = await page.evaluate(() => document.querySelector('a.donaldson-part-details span')?.innerText.trim());
        await page.goto(productUrl, { waitUntil: 'networkidle2' });

        // EXTRACCIÓN DE ATRIBUTOS Y REFERENCIAS
        await page.evaluate(() => {
            document.querySelector('a[data-target=".prodSpecInfoDiv"]')?.click();
            document.querySelector('a[data-target=".ListCrossReferenceDetailPageComp"]')?.click();
            document.querySelector('a[data-target=".ListEquipmentDetailPageComp"]')?.click();
        });
        await new Promise(r => setTimeout(r, 2000));

        // CAPTURA DE REFERENCIAS CRUDAS
        const rawRefs = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('.ListCrossReferenceDetailPageComp table tbody tr'));
            return rows.map(tr => tr.innerText.replace(/\t/g, ': ')).join(' | ');
        });

        const rawBody = await page.evaluate(() => document.body.innerText);

        // IA: DISERTACIÓN DE DATOS
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" },
            messages: [{
                role: "system",
                content: `Extrae JSON:
                - filter_type: (Ej: FUEL FILTER)
                - subtype: (Ej: SPIN-ON SECONDARY)
                - oem: códigos de maquinaria (solo números) -> AJ
                - cross: códigos de otras marcas de filtros (solo números) -> AK
                - specs: {thread, height_mm, micron}`
            }, { role: "user", content: `Analiza: ${rawBody.substring(0, 15000)}. Refs: ${rawRefs}` }]
        }, { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY.trim()}` } });

        const d = JSON.parse(response.data.choices[0].message.content);
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'];

        await sheet.addRow({
            'Input Code': inputCode,
            'ELIMFILTERS SKU': toElimSku(donaldsonSku || inputCode),
            'Description': `${forceString(d.filter_type)}, ${forceString(d.subtype)}`,
            'Filter Type': forceString(d.filter_type), // Columna D
            'Subtype': forceString(d.subtype),         // Columna E
            'Thread Size': forceString(d.specs?.thread),
            'Height (mm)': forceString(d.specs?.height_mm),
            'Micron Rating': forceString(d.specs?.micron),
            'OEM Codes': forceString(d.oem),           // Columna AJ
            'Cross Reference Codes': forceString(d.cross), // Columna AK
            'Technical Sheet URL': productUrl
        });

        await browser.close();
        return { status: "EXITO_V63", sku: inputCode };
    } catch (err) {
        if (browser) await browser.close();
        return { status: "ERROR", msg: err.message };
    }
}
app.get('/api/search/:code', async (req, res) => res.json(await runV63(req.params.code)));
app.listen(process.env.PORT || 8080, () => console.log("🚀 V63.00 TAXONOMY MASTER ONLINE"));
