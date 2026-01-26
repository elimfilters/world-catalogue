const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const uri = "mongodb+srv://vabreu_db_user:Kleo2026@cluster0.vairwow.mongodb.net/?appName=Cluster0";
const client = new MongoClient(uri);

// TABLA DE ADN OFICIAL
const ADN = {
    "ACEITE": { p: "EL8", t: "SINTRAX™" },
    "AIRE": { p: "EA1", t: "MACROCORE™" },
    "COMBUSTIBLE": { p: "EF9", t: "SYNTEPORE™" },
    "SEPARADOR": { p: "ES9", t: "AQUAGUARD™" },
    "HIDRAULICO": { p: "EH6", t: "NANOFORCE™" },
    "REFRIGERANTE": { p: "EW7", t: "COOLTECH™" },
    "CABINA": { p: "EC1", t: "MICROKAPPA™" }
};

async function startServer() {
    try {
        await client.connect();
        const db = client.db('elimfilters');

        app.post('/api/search', async (req, res) => {
            const { code, searchType } = req.body;
            const cleanCode = code.toUpperCase().trim();

            try {
                const filter = await db.collection('MASTER_UNIFIED_V5').findOne({ 
                    $or: [{ Final_SKU: cleanCode }, { Input_Code: cleanCode }, { OEM_Codes: cleanCode }, { Cross_Reference_Codes: cleanCode }]
                });

                if (filter) {
                    const cat = (filter.Category || "").toUpperCase();
                    const numOnly = (filter.Input_Code || "").replace(/[^0-9]/g, '');
                    const suffix = numOnly.slice(-4).padStart(4, '0');
                    
                    let finalSku = filter.Final_SKU;
                    let tech = "ELIMFILTERS GENUINE";

                    // BUSCAR MATCH EN LA TABLA DE ADN
                    for (let key in ADN) {
                        if (cat.includes(key)) {
                            finalSku = ADN[key].p + suffix;
                            tech = ADN[key].t;
                            break;
                        }
                    }

                    return res.json({
                        type: 'filter',
                        brand: filter.Brand,
                        sku: finalSku,
                        category: filter.Category,
                        technology: tech,
                        alternatives: filter.AK || filter.Cross_Reference_Codes || "N/A",
                        specs: filter.Specs || []
                    });
                }
                res.status(404).json({ message: "No encontrado" });
            } catch (e) { res.status(500).json({ error: e.message }); }
        });
        app.listen(process.env.PORT || 3000);
    } catch (err) { console.error(err); }
}
startServer();
