const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const uri = "mongodb+srv://vabreu_db_user:Kleo2026@cluster0.vairwow.mongodb.net/?appName=Cluster0";
const client = new MongoClient(uri);

async function startServer() {
    try {
        await client.connect();
        console.log("✅ Conectado a MongoDB Atlas");
        const db = client.db('elimfilters');

        app.post('/api/search', async (req, res) => {
            const { code, searchType } = req.body;
            console.log(`🔍 Buscando: ${code} en ${searchType}`);

            try {
                // 🔴 CABLE ROJO: PART NUMBER (Filtros)
                if (searchType === 'part-number') {
                    const filter = await db.collection('MASTER_UNIFIED_V5').findOne({ 
                        $or: [{ Input_Code: code.toUpperCase() }, { Final_SKU: code.toUpperCase() }]
                    });

                    if (filter) {
                        return res.json({
                            type: 'filter',
                            brand: filter.Brand,
                            sku: filter.Final_SKU,
                            category: filter.Category,
                            alternatives: filter.Alternative_Products || filter.AK || "N/A"
                        });
                    }
                }

                // 🟡 CABLE AMARILLO: EQUIPMENT / VIN (Kits)
                if (searchType === 'equipment' || searchType === 'vin') {
                    const kits = await db.collection('MASTER_KITS_V1').find({
                        $or: [
                            { Equipment_Model: { $regex: code, $options: 'i' } },
                            { VIN: code.toUpperCase() }
                        ]
                    }).toArray();

                    if (kits.length > 0) {
                        return res.json({ type: 'equipment-list', data: kits });
                    }
                }

                res.status(404).json({ message: "No se encontraron resultados" });
            } catch (e) {
                res.status(500).json({ error: e.message });
            }
        });

        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => console.log(`🚀 Servidor listo en puerto ${PORT}`));

    } catch (err) {
        console.error("❌ Error de conexión:", err);
    }
}

startServer();
