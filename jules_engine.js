const { MongoClient } = require('mongodb');
const Groq = require('groq-sdk');

const apiKey = "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";
const groq = new Groq({ apiKey });
const uri = "mongodb+srv://vabreu_db_user:Kleo2026@cluster0.vairwow.mongodb.net/?appName=Cluster0";
const client = new MongoClient(uri);

async function main() {
    try {
        await client.connect();
        const db = client.db('elimfilters');
        const col = db.collection('MASTER_UNIFIED_V5');
        
        console.log("🚀 Motor ELIMFILTERS encendido. Procesando 2.5M de registros...");

        while (true) {
            // Buscamos 10 códigos que no tengan marca (Brand) o tengan status RAW
            const docs = await col.find({ 
                $or: [{ status: 'RAW' }, { Brand: { $exists: false } }] 
            }).limit(10).toArray();

            if (docs.length === 0) {
                console.log("🏁 ¡BRUTAL! No quedan más códigos por procesar.");
                break;
            }

            const codes = docs.map(d => d.Input_Code);
            
            try {
                const completion = await groq.chat.completions.create({
                    messages: [
                        { role: 'system', content: 'Eres un experto en filtración industrial. Clasifica los códigos. Responde SOLAMENTE un JSON con este formato: {"results": [{"input": "CODIGO", "brand": "MARCA", "type": "ACEITE/AIRE/COMBUSTIBLE", "sku": "EL+4 DIGITOS"}]}' },
                        { role: 'user', content: `Clasifica estos códigos: ${codes.join(', ')}` }
                    ],
                    model: 'llama-3.3-70b-versatile',
                    response_format: { type: 'json_object' }
                });

                const content = JSON.parse(completion.choices[0].message.content);
                const results = content.results || [];

                const bulkOps = results.map(res => ({
                    updateOne: {
                        filter: { Input_Code: res.input },
                        update: { 
                            $set: { 
                                Brand: res.brand.toUpperCase(), 
                                Category: res.type.toUpperCase(), 
                                Final_SKU: res.sku.toUpperCase(), 
                                status: 'PROCESSED',
                                processed_at: new Date()
                            } 
                        }
                    }
                }));

                if (bulkOps.length > 0) {
                    await col.bulkWrite(bulkOps);
                    console.log(`✅ Lote procesado: ${results.length} códigos (Ej: ${results[0].input} -> ${results[0].sku})`);
                }

                // Pausa técnica de 2 segundos para no saturar el límite gratuito de Groq
                await new Promise(r => setTimeout(r, 2000));

            } catch (e) {
                if (e.message.includes('429')) {
                    console.log("⏳ Límite de velocidad alcanzado. Esperando 30 segundos...");
                    await new Promise(r => setTimeout(r, 30000));
                } else {
                    console.error("⚠️ Error en lote:", e.message);
                    await new Promise(r => setTimeout(r, 5000));
                }
            }
        }
    } catch (err) {
        console.error("❌ Error Crítico:", err.message);
    } finally {
        await client.close();
    }
}
main();
