const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const uri = "mongodb+srv://vabreu_db_user:Kleo2026@cluster0.vairwow.mongodb.net/?appName=Cluster0";
const client = new MongoClient(uri);

// MAPEO OFICIAL DE PREFIJOS Y TECNOLOGÍAS ELIMFILTERS
const PREFIJOS_MASTER = {
    "AIRE (MOTOR)": { prefijo: "EA1", tech: "MACROCORE™" },
    "CARCASAS E INTAKES": { prefijo: "EA2", tech: "INTEKCORE™" },
    "COMBUSTIBLE (FUEL)": { prefijo: "EF9", tech: "SYNTEPORE™" },
    "SEPARADOR DE AGUA": { prefijo: "ES9", tech: "AQUAGUARD™" },
    "ACEITE (LUBE)": { prefijo: "EL8", tech: "SINTRAX™" },
    "HIDRÁULICO": { prefijo: "EH6", tech: "NANOFORCE™" },
    "TURBINAS": { prefijo: "ET9", tech: "AQUAGUARD™" },
    "REFRIGERANTE (COOLANT)": { prefijo: "EW7", tech: "COOLTECH™" },
    "CABINA": { prefijo: "EC1", tech: "MICROKAPPA™" },
    "SECADOR DE AIRE (DRYER)": { prefijo: "ED4", tech: "DRYCORE™" },
    "DEF / ADBLUE": { prefijo: "ED3", tech: "BLUECLEAN™" },
    "GAS (LPG / GNC)": { prefijo: "EG3", tech: "GASULTRA™" },
    "MARINOS": { prefijo: "EM9", tech: "MARINECLEAN™" }
};

async function startServer() {
    try {
        await client.connect();
        const db = client.db('elimfilters');
        console.log("✅ Conectado a MongoDB - Flujo Maestro Activado");

        app.post('/api/search', async (req, res) => {
            const { code, searchType } = req.body;
            const cleanCode = code.toUpperCase().trim();

            try {
                // PASO 1: BUSCAR EN MASTER_UNIFIED_V5 (Columnas AH y AI / OEM y Cross)
                const filter = await db.collection('MASTER_UNIFIED_V5').findOne({ 
                    $or: [
                        { Final_SKU: cleanCode },
                        { Input_Code: cleanCode },
                        { "OEM_Codes": cleanCode }, // Columna AH
                        { "Cross_Reference_Codes": cleanCode } // Columna AI
                    ]
                });

                if (filter) {
                    // Si existe, devolvemos la info completa
                    return res.json({
                        type: 'filter',
                        brand: filter.Brand,
                        sku: filter.Final_SKU,
                        category: filter.Category,
                        technology: filter.Technology || "ELIMFILTERS GENUINE",
                        alternatives: filter.AK || filter.Cross_Reference_Codes || "N/A",
                        specs: filter.Specs || []
                    });
                } else {
                    // PASO 2: SI NO EXISTE, AQUÍ ES DONDE TUS AGENTES ENTRAN
                    // Por ahora informamos al plugin que debe esperar el proceso de creación
                    return res.status(202).json({ 
                        message: "SKU no encontrado. Jules está procesando el Duty y Scraper...",
                        status: "PROCESSING" 
                    });
                }
            } catch (e) {
                res.status(500).json({ error: e.message });
            }
        });

        app.listen(process.env.PORT || 3000, () => console.log("🚀 Servidor en Línea"));
    } catch (err) { console.error(err); }
}
startServer();
