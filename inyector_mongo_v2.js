const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://vabreu_db_user:Kleo2026@cluster0.vairwow.mongodb.net/?appName=Cluster0";
const client = new MongoClient(uri, { 
    connectTimeoutMS: 60000, 
    socketTimeoutMS: 60000 
});
const dataDir = './data';

async function inject() {
    try {
        await client.connect();
        const db = client.db('elimfilters');
        const col = db.collection('MASTER_UNIFIED_V5');
        
        const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
        console.log(`📡 RE-CONECTADO. Procesando ${files.length} archivos con cautela...`);

        for (const file of files) {
            const content = JSON.parse(fs.readFileSync(path.join(dataDir, file)));
            if (content.skus && content.skus.length > 0) {
                console.log(`\n📦 Archivo: ${file} (${content.skus.length} códigos)`);
                
                const operations = content.skus.map(sku => ({
                    updateOne: {
                        filter: { Input_Code: sku },
                        update: { 
                            $set: { status: 'RAW' },
                            $addToSet: { sources: content.source } 
                        },
                        upsert: true
                    }
                }));

                // Lotes más pequeños (500) para evitar el Time Out
                const batchSize = 500;
                for (let i = 0; i < operations.length; i += batchSize) {
                    const chunk = operations.slice(i, i + batchSize);
                    await col.bulkWrite(chunk, { ordered: false });
                    
                    const progreso = (((i + chunk.length) / operations.length) * 100).toFixed(1);
                    process.stdout.write(`\r   🚀 Subiendo... ${progreso}% completado`);
                    
                    // Pequeña pausa de 100ms para que el servidor respire
                    await new Promise(r => setTimeout(r, 100));
                }
                console.log(`\n✅ ${file} finalizado.`);
            }
        }
        console.log('\n🏆 INYECCIÓN EXITOSA. Los 2.5 millones de códigos están a salvo.');
    } catch (err) {
        console.error('\n❌ Error crítico:', err.message);
    } finally {
        await client.close();
    }
}

inject();
