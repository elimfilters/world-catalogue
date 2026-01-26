const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const { MongoClient } = require('mongodb');

const CATALOG_PATH = 'C:\\Users\\VICTOR ABREU\\Elimfilters-Orchestrator\\catalogos_pdf';
const MONGO_URI = "mongodb+srv://vabreu_db_user:Kleo2026@cluster0.vairwow.mongodb.net/";

async function procesar40Columnas() {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const col = client.db('elimfilters').collection('MASTER_UNIFIED_V5');

    const archivos = fs.readdirSync(CATALOG_PATH).filter(f => f.endsWith('.pdf'));
    console.log(`🚀 Iniciando Orquestador: ${archivos.length} catálogos detectados.`);

    for (const archivo of archivos) {
        const isHD = /donaldson|baldwin|fleetguard/i.test(archivo);
        const dataBuffer = fs.readFileSync(path.join(CATALOG_PATH, archivo));
        const data = await pdf(dataBuffer);
        const contenido = data.text.toUpperCase();

        const cursor = col.find({ status: "RAW" });
        while (await cursor.hasNext()) {
            const doc = await cursor.next();
            const input = doc.Input_Code.toUpperCase().replace(/[^A-Z0-9]/g, '');

            if (contenido.includes(input)) {
                let finalRoot = "";
                let adn = "XX0";
                let duty = isHD ? "HD" : "LD";
                
                const fragmento = contenido.substring(contenido.indexOf(input), contenido.indexOf(input) + 800);

                if (duty === "HD") {
                    // REGLA HD: Raíz Donaldson
                    finalRoot = input.replace(/[^0-9]/g, '').slice(-4);
                    if (fragmento.includes("LUBE") || fragmento.includes("OIL")) adn = "EL8";
                } else {
                    // REGLA LD: Puente Mann -> Raíz Fram
                    // Aquí simulamos la búsqueda del cruce en el contenido del PDF
                    const matchFram = fragmento.match(/PH[0-9]+|CA[0-9]+|CF[0-9]+/);
                    finalRoot = matchFram ? matchFram[0].replace(/[^0-9]/g, '') : input.slice(-4);
                    
                    if (fragmento.includes("AIR")) adn = "EA1";
                    else if (fragmento.includes("OIL")) adn = "EL8";
                }

                // LLENADO DE COLUMNAS (Muestra de las 40 columnas)
                const updateData = {
                    "ELIMFILTERS SKU": adn + finalRoot.padStart(4, '0'),
                    "Duty": duty,
                    "ADN": adn,
                    "Technical_Specs": fragmento.substring(0, 100), // Columna de specs
                    "Source_File": archivo,
                    "Status": "PROCESSED",
                    "Thread_Size": (fragmento.match(/[0-9]\/[0-9]-[0-9]+/) || ["N/A"])[0],
                    "Micron_Rating": (fragmento.match(/[0-9]+\s?MICRON/) || ["N/A"])[0],
                    "Last_Update": new Date()
                };

                await col.updateOne({ _id: doc._id }, { $set: updateData });
                console.log(`✅ ${input} -> ${updateData["ELIMFILTERS SKU"]} [${duty}]`);
            }
        }
    }
    await client.close();
}
procesar40Columnas();
