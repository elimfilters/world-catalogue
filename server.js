const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

puppeteer.use(StealthPlugin());
const app = express();

async function runStealth(code) {
    console.log(`[V26.00] 👤 Navegador Humano Activo para: ${code}`);
    
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        
        // Simular que somos un usuario de Windows real
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log(`🔎 Buscando ${code}...`);
        await page.goto(`https://shop.donaldson.com/store/es-us/search?Ntt=${code}*`, { waitUntil: 'networkidle2' });
        
        // Esperar al mosaico y entrar
        await page.waitForSelector('a.donaldson-part-details', { timeout: 15000 });
        await page.click('a.donaldson-part-details');

        // Pestaña de atributos
        await page.waitForSelector("a[data-target='.prodSpecInfoDiv']", { timeout: 15000 });
        await page.click("a[data-target='.prodSpecInfoDiv']");

        // Botón Mostrar Más
        try {
            await page.waitForSelector("#showMoreProductSpecsButton", { timeout: 5000 });
            await page.click("#showMoreProductSpecsButton");
        } catch (e) { console.log("Botón mostrar más no necesario o no hallado."); }

        // Esperar 2 segundos para que el JS termine de pintar la tabla
        await new Promise(r => setTimeout(r, 2000));

        // Extraer datos directamente del DOM de Donaldson
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

        console.log(`✅ EXTRACCIÓN EXITOSA: ${specs.thread}`);
        await syncToGoogle({ ...specs, mainCode: code });

    } catch (err) {
        console.error("❌ ERROR EN NAVEGACIÓN:", err.message);
    } finally {
        await browser.close();
    }
}

async function syncToGoogle(d) {
    try {
        const auth = new JWT({
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'];
        await sheet.addRow({
            'Input Code': d.mainCode,
            'Description': d.title,
            'Thread Size': d.thread,
            'Audit Status': `V26_STEALTH_${new Date().toLocaleTimeString()}`
        });
    } catch (e) { console.error("Error Google:", e.message); }
}

app.get('/api/search/:code', (req, res) => {
    runStealth(req.params.code.toUpperCase());
    res.json({ status: "STEALTH_ON", message: "Procesando con Navegador Indetectable. Revisa Railway Logs." });
});

app.listen(process.env.PORT || 8080, () => console.log("🚀 V26.00 STEALTH ONLINE"));
