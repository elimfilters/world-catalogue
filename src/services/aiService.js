const fs = require('fs');
const path = require('path');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

// CARGA EN RAM: Solo se hace una vez al arrancar el servidor
const knowledgePath = path.join(__dirname, '..', 'knowledge', 'noteLLM.json');
let knowledge = [];

try {
    if (fs.existsSync(knowledgePath)) {
        knowledge = JSON.parse(fs.readFileSync(knowledgePath, 'utf8'));
        console.log('🧠 Knowledge Base cargada en RAM: ' + knowledge.length + ' documentos.');
    } else {
        console.log('⚠️ Warning: noteLLM.json no encontrado.');
    }
} catch (e) {
    console.error('❌ Error cargando JSON:', e.message);
}

const getDutyClassification = async (query) => {
    try {
        if (knowledge.length === 0) return "DESCONOCIDO (Sin datos)";

        const searchTerm = query.toUpperCase().trim();
        const context = knowledge
            .filter(item => item.d.toUpperCase().includes(searchTerm))
            .map(item => item.d)
            .join('\n').substring(0, 3000);

        const chat = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "Responde solo: HD, LD o DESCONOCIDO." },
                { role: "user", content: "Contexto: " + context + "\n\nCódigo: " + query }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.1
        });

        return chat.choices[0]?.message?.content?.trim().toUpperCase() || "DESCONOCIDO";
    } catch (e) {
        return "ERROR: " + e.message;
    }
};

module.exports = { getDutyClassification };