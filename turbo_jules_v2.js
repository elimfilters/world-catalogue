const { MongoClient } = require('mongodb');
const Groq = require('groq-sdk');
// VINCULACIÓN CON TUS SCRAPERS REALES
const { runDonaldsonFull } = require('./src/scrapers/donaldsonScraper');

const groq = new Groq({ apiKey: "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" });
const uri = "mongodb+srv://vabreu_db_user:Kleo2026@cluster0.vairwow.mongodb.net/";

const ADN_MASTER = {
    "AIRE (MOTOR)": { p: "EA1", t: "MACROCORE™" },
    "CARCASAS E INTAKES": { p: "EA2", t: "INTEKCORE™" },
    "COMBUSTIBLE (FUEL)": { p: "EF9", t: "SYNTEPORE™" },
    "SEPARADOR DE AGUA": { p: "ES9", t: "AQUAGUARD™" },
    "ACEITE (LUBE)": { p: "EL8", t: "SINTRAX™" },
    "HIDRAULICO": { p: "EH6", t: "NANOFORCE™" },
    "TURBINAS (RACOR/PARKER)": { p: "ET9", t: "AQUAGUARD™" },
    "REFRIGERANTE (COOLANT)": { p: "EW7", t: "COOLTECH™" },
    "CABINA (AIRE ACOND.)": { p: "EC1", t: "MICROKAPPA™" },
    "SECADOR DE AIRE (DRYER)": { p: "ED4", t: "DRYCORE™" },
    "DEF / ADBLUE": { p: "ED3", t: "BLUECLEAN™" },
    "GAS (LPG / GNC)": { p: "EG3", t: "GASULTRA™" },
    "KITS DE SERVICIO (HD)": { p: "EK5", t: "DURATECH™" },
    "KITS DE SERVICIO (LD)": { p: "EK3", t: "DURATECH™" },
    "MARINOS (IN/OUTBOARD)": { p: "EM9", t: "MARINECLEAN™" }
};

async function startHybridEngine() {
    const client = new MongoClient(uri);
    await client.connect();
    const col = client.db('elimfilters').collection('MASTER_UNIFIED_V5');
    console.log("🚀 MOTOR HÍBRIDO ACTIVADO: Escaneando Database...");

    while (true) {
        const doc = await col.findOne({ status: 'RAW' });
        if (!doc) {
            console.log("🏁 No hay más registros RAW. Trabajo terminado.");
            break;
        }

        try {
            console.log(`\n📦 Procesando: ${doc.Input_Code}`);
            
            // 1. EVALUAR INTEGRIDAD (Tu propuesta)
            let rawData = doc.Description || "";
            let scraperData = null;

            if (rawData.length < 10 || !doc["Thread Size"]) {
                console.log(`🔍 Data insuficiente en DB. Activando Scraper Donaldson para ${doc.Input_Code}...`);
                scraperData = await runDonaldsonFull(doc.Input_Code);
                rawData = JSON.stringify(scraperData);
            }

            // 2. VALIDACIÓN TÉCNICA (Groq como Auditor)
            const prompt = `Analiza estos datos técnicos del filtro ${doc.Input_Code}: ${rawData}. 
            Determina la CATEGORIA exacta de esta lista: ${Object.keys(ADN_MASTER).join(', ')}. 
            Determina si es HD o LD. Responde solo JSON: {"cat":"","duty":"","thread":"","micron":""}`;

            const completion = await groq.chat.completions.create({
                messages: [{ role: 'system', content: prompt }],
                model: 'llama-3.1-8b-instant',
                response_format: { type: 'json_object' }
            });

            const validation = JSON.parse(completion.choices[0].message.content);
            const adn = ADN_MASTER[validation.cat] || { p: "EF", t: "GENUINE" };
            
            // 3. GENERACIÓN DE SKU MATEMÁTICO
            const cleanDigits = doc.Input_Code.replace(/[^0-9]/g, '');
            const suffix = cleanDigits.slice(-4).padStart(4, '0');
            const finalSKU = adn.p + suffix;

            // 4. INYECCIÓN DE LAS 46 COLUMNAS (Muestra representativa)
            const updateFields = {
                "ELIMFILTERS SKU": finalSKU,
                "Prefix": adn.p,
                "ELIMFILTERS Technology": adn.t,
                "Filter Type": validation.cat,
                "Duty": validation.duty,
                "Thread Size": validation.thread || (scraperData ? scraperData.thread : ""),
                "Micron Rating": validation.micron || (scraperData ? scraperData.micron : ""),
                "status": "PROCESSED",
                "last_audit": new Date()
            };

            await col.updateOne({ _id: doc._id }, { $set: updateFields });
            console.log(`✅ CERTIFICADO: ${doc.Input_Code} -> ${finalSKU} | ${adn.t} | Category: ${validation.cat}`);

        } catch (error) {
            console.error(`⚠️ Error procesando ${doc.Input_Code}:`, error.message);
            await col.updateOne({ _id: doc._id }, { $set: { status: 'ERROR', error_log: error.message } });
        }
    }
    await client.close();
}

startHybridEngine();
