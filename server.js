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
        const db = client.db('elimfilters');

        app.post('/api/search', async (req, res) => {
            const { code, searchType } = req.body;
            try {
                if (searchType === 'part-number') {
                    const filter = await db.collection('MASTER_UNIFIED_V5').findOne({ 
                        $or: [{ Input_Code: code.toUpperCase() }, { Final_SKU: code.toUpperCase() }]
                    });

                    if (filter) {
                        // CORRECCIÓN DE PREFIJO DINÁMICO
                        let prefijo = "EF"; 
                        const cat = (filter.Category || "").toUpperCase();
                        if (cat.includes("ACEITE") || cat.includes("OIL")) prefijo = "EL8";
                        if (cat.includes("AIRE") || cat.includes("AIR")) prefijo = "EA1";
                        if (cat.includes("COMBUSTIBLE") || cat.includes("FUEL")) prefijo = "EF2";

                        // REGLA DE LOS 4 NÚMEROS
                        const numOnly = filter.Input_Code.replace(/[^0-9]/g, '');
                        const suffix = numOnly.slice(-4).padStart(4, '0');
                        const skuCorregido = filter.Final_SKU || (prefijo + suffix);

                        return res.json({
                            type: 'filter',
                            brand: filter.Brand,
                            sku: skuCorregido,
                            category: filter.Category,
                            // LEER COLUMNA AK O ALTERNATIVE_PRODUCTS
                            alternatives: filter.Alternative_Products || filter.AK || "Consulte con soporte"
                        });
                    }
                }
                res.status(404).json({ message: "No encontrado" });
            } catch (e) { res.status(500).json({ error: e.message }); }
        });

        app.listen(process.env.PORT || 3000, () => console.log("🚀 Servidor Corregido"));
    } catch (err) { console.error(err); }
}
startServer();
