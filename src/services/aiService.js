const fs = require('fs');
const path = require('path');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

const knowledgePath = path.join(__dirname, '..', 'knowledge', 'noteLLM.json');
let knowledge = [];

try {
    if (fs.existsSync(knowledgePath)) {
        knowledge = JSON.parse(fs.readFileSync(knowledgePath, 'utf8'));
        console.log('🧠 Memoria cargada: ' + knowledge.length + ' docs.');
    }
} catch (e) { console.error('Error JSON:', e.message); }

const getDutyClassification = async (query) => {
    try {
        if (!query) return "DESCONOCIDO";
        const term = query.toUpperCase().trim();

        // BUSCADOR ULTRA-SEGURO: Verifica que el dato exista antes de convertir a mayúsculas
        const context = knowledge
            .filter(item => {
                const contenido = item.d || item.data || item.texto || "";
                return contenido.toUpperCase().includes(term);
            })
            .map(item => item.d || item.data || item.texto)
            .join('\n').substring(0, 3000);

        if (!process.env.GROQ_API_KEY) return "DESCONOCIDO (Falta API KEY)";

        const chat = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "Eres un experto en filtros. Responde solo HD, LD o DESCONOCIDO." },
                { role: "user", content: "Contexto: " + (context || "No hay datos") + "\n\nCódigo: " + query }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.1
        });

        return chat.choices[0]?.message?.content?.trim().toUpperCase() || "DESCONOCIDO";
    } catch (e) {
        console.error('Error en clasificación:', e.message);
        return "ERROR_MOTOR";
    }
};

module.exports = { getDutyClassification };