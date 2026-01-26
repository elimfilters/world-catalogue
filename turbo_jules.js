const { MongoClient } = require('mongodb');
const Groq = require('groq-sdk');

const apiKey = "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";
const groq = new Groq({ apiKey });
const uri = "mongodb+srv://vabreu_db_user:Kleo2026@cluster0.vairwow.mongodb.net/?appName=Cluster0";
const client = new MongoClient(uri);

// MATRIZ DE ADN PARA EL PROCESAMIENTO
const MATRIZ_INSTRUCTION = `
Reglas de Prefijo + últimos 4 dígitos del código:
- AIRE (MOTOR) -> EA1 | TEC: MACROCORE™
- ACEITE (LUBE) -> EL8 | TEC: SINTRAX™
- COMBUSTIBLE -> EF9 | TEC: SYNTEPORE™
- SEPARADOR AGUA -> ES9 | TEC: AQUAGUARD™
- HIDRAULICO -> EH6 | TEC: NANOFORCE™
- REFRIGERANTE -> EW7 | TEC: COOLTECH™
- CABINA -> EC1 | TEC: MICROKAPPA™
`;

async function processWorker(workerId) {
    const localClient = new MongoClient(uri);
    await localClient.connect();
    const col = localClient.db('elimfilters').collection('MASTER_UNIFIED_V5');
    console.log(`🚀 Worker ${workerId} con ADN Elimfilters activado.`);

    while (true) {
        try {
            const docs = await col.find({ status: 'RAW' }).limit(40).toArray();
            if (docs.length === 0) break;

            const ids = docs.map(d => d._id);
            await col.updateMany({ _id: { $in: ids } }, { $set: { status: 'PROCESSING' } });

            const codes = docs.map(d => d.Input_Code);

            const completion = await groq.chat.completions.create({
                messages: [
                    { role: 'system', content: `Eres experto en filtros industriales. Clasifica y genera SKUs según esta MATRIZ: ${MATRIZ_INSTRUCTION}. 
                    Responde SOLO JSON con este formato: {"results":[{"input":"P550440","brand":"DONALDSON","type":"ACEITE (LUBE)","sku":"EL80440","tech":"SINTRAX™","cross":"P550440, LF3349"}]}` },
                    { role: 'user', content: `Procesa estos códigos: ${codes.join(',')}` }
                ],
                model: 'llama-3.1-8b-instant',
                response_format: { type: 'json_object' }
            });

            const results = JSON.parse(completion.choices[0].message.content).results;
            const bulkOps = results.map(res => ({
                updateOne: {
                    filter: { Input_Code: res.input },
                    update: { $set: { 
                        Brand: res.brand, 
                        Category: res.type, 
                        Final_SKU: res.sku, 
                        Technology: res.tech,
                        Cross_Reference_Codes: res.cross,
                        status: 'PROCESSED' 
                    } }
                }
            }));

            if (bulkOps.length > 0) await col.bulkWrite(bulkOps);
            console.log(`Worker ${workerId} ✅: +${results.length} procesados con SKU correcto.`);

        } catch (e) {
            console.error(`Worker ${workerId} ❌:`, e.message);
            await new Promise(r => setTimeout(r, 5000));
        }
    }
    await localClient.close();
}

Promise.all([processWorker(1), processWorker(2), processWorker(3), processWorker(4), processWorker(5)]);
