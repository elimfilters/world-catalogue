const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://vabreu_db_user:Kleo2026@cluster0.vairwow.mongodb.net/?appName=Cluster0";
const client = new MongoClient(uri);

async function run() {
    try {
        await client.connect();
        const db = client.db('elimfilters');
        const col = db.collection('MASTER_UNIFIED_V5');
        const files = fs.readdirSync('./data').filter(f => f.endsWith('.json'));

        console.log(`🚀 Iniciando limpieza de ${files.length} archivos...`);

        for (const file of files) {
            try {
                const data = JSON.parse(fs.readFileSync(`./data/${file}`));
                if (!data.skus || data.skus.length === 0) continue;

                // Si el archivo es muy grande (> 50,000 skus), lo dejamos para el final
                if (data.skus.length > 50000) {
                    console.log(`⏩ Saltando temporalmente ${file} (Muy pesado para esta conexión)`);
                    continue;
                }

                console.log(`📤 Inyectando ${data.skus.length} códigos de ${file}...`);
                const ops = data.skus.map(sku => ({
                    updateOne: {
                        filter: { Input_Code: sku },
                        update: { $set: { status: 'RAW' }, $addToSet: { sources: data.source } },
                        upsert: true
                    }
                }));

                // Lote pequeño de 200 para que no muera la conexión
                for (let i = 0; i < ops.length; i += 200) {
                    await col.bulkWrite(ops.slice(i, i + 200), { ordered: false });
                }
                console.log(`✅ ${file} ADENTRO.`);
            } catch (e) {
                console.log(`❌ Falló ${file}, siguiendo con el próximo...`);
            }
        }
        console.log('\n🏁 ¡TERMINAMOS LOS ARCHIVOS VIABLES! Los gordos los subimos luego.');
    } finally {
        await client.close();
    }
}
run();
