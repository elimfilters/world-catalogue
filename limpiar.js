const { MongoClient } = require("mongodb");
const uri = "mongodb+srv://vabreu_db_user:Kleo2026@cluster0.vairwow.mongodb.net/?appName=Cluster0";
const client = new MongoClient(uri);

async function run() {
    try {
        await client.connect();
        const col = client.db("elimfilters").collection("MASTER_UNIFIED_V5");
        
        // Regresamos todo a RAW para que Jules lo procese con la nueva matriz de ADN
        const result = await col.updateMany(
            { status: "PROCESSED" }, 
            { $set: { status: "RAW" } }
        );
        
        console.log(`♻️ RESET EXITOSO: ${result.modifiedCount} registros listos para el nuevo ADN.`);
    } catch (err) {
        console.error("❌ Error:", err);
    } finally {
        await client.close();
    }
}
run();
