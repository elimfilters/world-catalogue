const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://vabreu_db_user:Kleo2026@cluster0.vairwow.mongodb.net/?appName=Cluster0";
const client = new MongoClient(uri);
const dataDir = './data';

async function inject() {
    try {
        await client.connect();
        const db = client.db('elimfilters');
        const col = db.collection('MASTER_UNIFIED_V5');
        
        const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
        console.log(`📡 Conectado. Preparando inyección de ${files.length} archivos JSON...`);

        for (const file of files) {
            const content = JSON.parse(fs.readFileSync(path.join(dataDir, file)));
            if (content.skus && content.skus.length > 0) {
                console.log(`📤 Subiendo ${content.skus.length} códigos de: ${file}...`);
                
                // Preparamos los datos para que no se dupliquen
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

                // Subimos en lotes de 1000 para no saturar la red
                for (let i = 0; i < operations.length; i += 1000) {
                    const chunk = operations.slice(i, i + 1000);
                    await col.bulkWrite(chunk, { ordered: false });
                }
                console.log(`✅ Finalizado: ${file}`);
            }
        }
        console.log('\n🏆 ¡MISIÓN CUMPLIDA! 2.5 millones de códigos en la nube.');
    } catch (err) {
        console.error('❌ Error inyectando datos:', err);
    } finally {
        await client.close();
    }
}

inject();
