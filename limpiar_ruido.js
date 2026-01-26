const { MongoClient } = require('mongodb');
const MONGO_URI = "mongodb+srv://vabreu_db_user:Kleo2026@cluster0.vairwow.mongodb.net/";

async function limpiar() {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const col = client.db('elimfilters').collection('MASTER_UNIFIED_V5');

    // Resetear registros que no tienen números (falsos positivos como 'APPLICATION')
    const result = await col.updateMany(
        { 
            Input_Code: { $not: /[0-9]/ }, 
            status: "PROCESSED" 
        },
        { $set: { status: "RAW", "ELIMFILTERS SKU": null } }
    );

    console.log(`🧹 Limpieza completada: ${result.modifiedCount} palabras genéricas eliminadas.`);
    await client.close();
}
limpiar();
