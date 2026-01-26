const { MongoClient } = require('mongodb');
const Groq = require('groq-sdk');

// Configuración
const groq = new Groq({ apiKey: 'gsk_Z1qgGqWn8K...' }); // Sustituye por tu API KEY de Groq
const client = new MongoClient("mongodb+srv://vabreu_db_user:Kleo2026@cluster0.vairwow.mongodb.net/");

async function processBatch() {
    try {
        await client.connect();
        const col = client.db('elimfilters').collection('MASTER_UNIFIED_V5');

        // 1. Buscamos 20 códigos que aún no tengan categoría (RAW)
        const docs = await col.find({ status: 'RAW' }).limit(20).toArray();
        if (docs.length === 0) return console.log("🏁 No hay más códigos para procesar.");

        const codes = docs.map(d => d.Input_Code);

        // 2. El "Prompt Maestro" blindado
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "Eres un clasificador de filtros industriales. Entrada: Lista de códigos. Salida: JSON con este formato: { 'results': [{ 'input': 'P550440', 'brand': 'DONALDSON', 'type': 'ACEITE', 'sku': 'EL0440' }] }. Reglas: SKU = EL para Aceite, EF para Combustible + últimos 4 dígitos." },
                { role: "user", content: `Clasifica estos códigos: ${codes.join(', ')}` }
            ],
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" }
        });

        // 3. Procesar respuesta y actualizar MongoDB
        const results = JSON.parse(chatCompletion.choices[0].message.content).results;

        for (const res of results) {
            await col.updateOne(
                { Input_Code: res.input },
                { $set: { 
                    Brand: res.brand, 
                    Category: res.type, 
                    Final_SKU: res.sku, 
                    status: 'PROCESSED' 
                }}
            );
        }
        console.log(`✅ Lote de ${results.length} códigos procesado y guardado.`);

    } catch (err) {
        console.error("❌ Error:", err.message);
    } finally {
        await client.close();
    }
}

// Ejecutar cada 5 segundos para no quemar la API
setInterval(processBatch, 5000);
