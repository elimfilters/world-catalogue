const { MongoClient } = require('mongodb');
const Groq = require('groq-sdk');

const apiKey = "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";
const groq = new Groq({ apiKey });
const uri = "mongodb+srv://vabreu_db_user:Kleo2026@cluster0.vairwow.mongodb.net/?appName=Cluster0";
const client = new MongoClient(uri);

async function processWorker(workerId) {
    const localClient = new MongoClient(uri);
    await localClient.connect();
    const col = localClient.db('elimfilters').collection('MASTER_UNIFIED_V5');
    
    console.log(`🚀 Worker ${workerId} operativo.`);

    while (true) {
        try {
            // Buscamos códigos RAW
            const docs = await col.find({ status: 'RAW' }).limit(40).toArray(); 
            if (docs.length === 0) break;

            const ids = docs.map(d => d._id);
            // Bloqueo inmediato para que otros workers no repitan el trabajo
            await col.updateMany({ _id: { $in: ids } }, { $set: { status: 'PROCESSING' } });

            const codes = docs.map(d => d.Input_Code);
            
            const completion = await groq.chat.completions.create({
                messages: [
                    { role: 'system', content: 'Eres experto en filtros. Responde SOLO JSON: {"results":[{"input":"P550440","brand":"DONALDSON","type":"ACEITE","sku":"EL0440"}]}. Regla SKU: EL/EF + últimos 4 dígitos.' },
                    { role: 'user', content: `Clasifica: ${codes.join(',')}` }
                ],
                model: 'llama-3.1-8b-instant', 
                response_format: { type: 'json_object' }
            });

            const results = JSON.parse(completion.choices[0].message.content).results;
            const bulkOps = results.map(res => ({
                updateOne: {
                    filter: { Input_Code: res.input },
                    update: { $set: { Brand: res.brand, Category: res.type, Final_SKU: res.sku, status: 'PROCESSED' } }
                }
            }));

            if (bulkOps.length > 0) await col.bulkWrite(bulkOps);
            console.log(`Worker ${workerId} ✅: +${results.length} registros clasificados.`);

        } catch (e) {
            if (e.message.includes('429')) {
                console.log(`Worker ${workerId} ⏳: Límite excedido, esperando...`);
                await new Promise(r => setTimeout(r, 10000));
            } else {
                console.error(`Worker ${workerId} ❌:`, e.message);
                await new Promise(r => setTimeout(r, 3000));
            }
        }
    }
    await localClient.close();
}

// Corremos 5 en paralelo para máxima velocidad
Promise.all([processWorker(1), processWorker(2), processWorker(3), processWorker(4), processWorker(5)])
    .then(() => {
        console.log("🏁 ¡Misión terminada! 2.5M de códigos procesados.");
        process.exit();
    });
