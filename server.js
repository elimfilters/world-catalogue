const express = require('express');
const { MongoClient } = require('mongodb');
const axios = require('axios');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

puppeteer.use(StealthPlugin());
const app = express();

// 1. CONEXIONES
const auth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});
const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);

// 2. NARRATIVA DE BRANDING
const NARRATIVE = {
    "EA1": { tech: "MACROCORE™", msg: "aire 100% puro al motor" },
    "EF9": { tech: "SYNTEPORE™", msg: "armadura sintética, combustible 100% al motor" },
    "ES9": { tech: "FUEL AQUAGUARD", msg: "protección total contra el agua" },
    "EL8": { tech: "SINTRAX™", msg: "lubricación extrema para el sistema" }
};

app.get('/', (req, res) => res.send('<h1>✅ ELIMFILTERS ENGINE V104 IS ONLINE</h1>'));

app.get('/api/search/:code', async (req, res) => {
    const { code } = req.params;
    let initialClient;

    try {
        initialClient = new MongoClient(process.env.MONGO_URL);
        await initialClient.connect();
        const db = initialClient.db('Cluster0');
        const col = db.collection('products');

        const existingMongo = await col.findOne({ $or: [{ oem: code }, { cross: new RegExp(code, 'i') }] });
        if (existingMongo) {
            console.log(`[V105] Código ${code} ya existe en MongoDB.`);
            return res.status(200).json({ status: "FOUND_MONGO", data: existingMongo });
        }

        await doc.loadInfo();
        const sheet = doc.sheetsByTitle["MASTER_UNIFIED_V5"];
        const rows = await sheet.getRows();
        const existingSheetRow = rows.find(r => r.get('OEM') === code || (r.get('Cross Reference') && r.get('Cross Reference').includes(code)));
        if (existingSheetRow) {
            console.log(`[V105] Código ${code} ya existe en Google Sheet.`);
            const headers = existingSheetRow._sheet.headerValues;
            const data = {};
            headers.forEach(header => { data[header] = existingSheetRow.get(header); });
            return res.status(200).json({ status: "FOUND_SHEET", data });
        }

        res.status(202).json({ status: "ACCEPTED", message: `Código ${code} aceptado para procesamiento.` });

        (async () => {
            let bgClient, browser;
            try {
                bgClient = new MongoClient(process.env.MONGO_URL);
                await bgClient.connect();
                const db = bgClient.db('Cluster0');
                const col = db.collection('products');
                
                // Sheet ya cargado
                const groqDuty = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                    model: "llama-3.3-70b-versatile",
                    messages: [{ role: "system", content: "Responde solo 'HD' o 'LD' analizando el código o fabricante." }, { role: "user", content: `Clasifica: ${code}` }]
                }, { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` } });
                const duty = groqDuty.data.choices[0].message.content.trim();

                if (duty === "HD") {
                    browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox'] });
                    const page = await browser.newPage();
                    await page.goto(`https://shop.donaldson.com/store/es-us/search?Ntt=${code}*`, { waitUntil: 'networkidle2', timeout: 60000 });

                    const productUrl = await page.evaluate(() => document.querySelector('.donaldson-part-details')?.href);
                    if (productUrl) {
                        await page.goto(productUrl, { waitUntil: 'networkidle2' });
                        const donSku = await page.evaluate(() => document.querySelector('.donaldson-part-number')?.innerText.trim());
                        const donRaw = await page.evaluate(() => document.body.innerText);

                        const last4 = donSku.replace(/[^0-9]/g, '').slice(-4);
                        let p = "EF9";
                        if (donRaw.toUpperCase().includes("AIR")) p = "EA1";
                        if (donRaw.toUpperCase().includes("OIL")) p = "EL8";
                        if (donRaw.toUpperCase().includes("WATER")) p = "ES9";
                        const elimSku = p + last4;
                        const tech = NARRATIVE[p].tech;
                        const desc = `Elimfilters® ${elimSku} delivers superior performance. ${tech} ${NARRATIVE[p].msg}.`;

                        const techData = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                            model: "llama-3.3-70b-versatile",
                            response_format: { type: "json_object" },
                            messages: [{ role: "system", content: "Extrae JSON técnico para 39 columnas. OEM y Cross solo números separados por comas." }, { role: "user", content: donRaw.substring(0, 12000) }]
                        }, { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` } });
                        const d = JSON.parse(techData.data.choices[0].message.content);

                        await sheet.addRow([
                            code, elimSku, desc, d.type, d.subtype, d.install, p, tech, duty,
                            d.thread, d.h_mm, d.h_in, d.od_mm, d.od_in, d.id_mm, d.g_od_mm, d.g_od_in,
                            d.g_id_mm, d.g_id_in, d.iso, d.micron, d.beta, d.efficiency, d.pressure,
                            d.flow_l, d.flow_gpm, d.flow_cfm, d.burst, d.collapse, d.bypass, d.press_valve,
                            "No", d.special, d.oem, d.cross, d.equip_apps, d.alternatives, d.engines, d.years
                        ]);

                        await col.updateOne({ sku: elimSku }, { $set: { sku: elimSku, oem: code, data: d, duty, updated: new Date() } }, { upsert: true });
                        console.log(`✅ [V105-BG] Procesado HD (Donaldson) con éxito: ${elimSku}`);
                    }
                } else if (duty === "LD") {
                    browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox'] });
                    const page = await browser.newPage();
                    await page.goto(`https://www.fram.com/parts-search/${code}`, { waitUntil: 'networkidle2', timeout: 60000 });

                    const productFound = await page.evaluate(() => !document.body.innerText.includes("Sorry, we couldn’t find a FRAM part for"));

                    if (productFound) {
                        const framSku = await page.evaluate(() => document.querySelector('h1')?.innerText.trim() || '');
                        const framRaw = await page.evaluate(() => document.body.innerText);

                        const last4 = (framSku || code).replace(/[^0-9]/g, '').slice(-4);
                        let p = "EF9";
                        if (framRaw.toUpperCase().includes("AIR")) p = "EA1";
                        if (framRaw.toUpperCase().includes("OIL")) p = "EL8";
                        if (framRaw.toUpperCase().includes("WATER")) p = "ES9";

                        const elimSku = p + last4;
                        const tech = NARRATIVE[p].tech;
                        const desc = `Elimfilters® ${elimSku} delivers superior performance. ${tech} ${NARRATIVE[p].msg}.`;

                        const techData = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                            model: "llama-3.3-70b-versatile",
                            response_format: { type: "json_object" },
                            messages: [{ role: "system", content: "Extrae JSON técnico para 39 columnas. OEM y Cross solo números separados por comas." }, { role: "user", content: framRaw.substring(0, 12000) }]
                        }, { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` } });
                        const d = JSON.parse(techData.data.choices[0].message.content);

                        await sheet.addRow([
                            code, elimSku, desc, d.type, d.subtype, d.install, p, tech, duty,
                            d.thread, d.h_mm, d.h_in, d.od_mm, d.od_in, d.id_mm, d.g_od_mm, d.g_od_in,
                            d.g_id_mm, d.g_id_in, d.iso, d.micron, d.beta, d.efficiency, d.pressure,
                            d.flow_l, d.flow_gpm, d.flow_cfm, d.burst, d.collapse, d.bypass, d.press_valve,
                            "No", d.special, d.oem, d.cross, d.equip_apps, d.alternatives, d.engines, d.years
                        ]);

                        await col.updateOne({ sku: elimSku }, { $set: { sku: elimSku, oem: code, data: d, duty, updated: new Date() } }, { upsert: true });
                        console.log(`✅ [V105-BG] Procesado LD (FRAM) con éxito: ${elimSku}`);
                    } else {
                        console.log(`[V105-BG] No se encontró producto para ${code} en FRAM.`);
                    }
                }
            } catch (e) {
                console.error(`❌ [ERROR-BG] ${code}:`, e.message);
            } finally {
                if (browser) await browser.close();
                if (bgClient) await bgClient.close();
            }
        })();
    } catch (e) {
        console.error(`❌ [ERROR-MAIN] ${code}:`, e.message);
        if (!res.headersSent) {
            res.status(500).json({ status: "ERROR", message: "Error en el procesamiento inicial." });
        }
    } finally {
        if (initialClient) await initialClient.close();
    }
});

app.listen(process.env.PORT || 8080, () => console.log("🚀 V105 FINAL DEPLOYED"));