const fs = require('fs');
const path = require('path');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

const getDutyClassification = async (query) => {
    try {
        const knowledgePath = path.join(__dirname, '..', 'knowledge', 'noteLLM.json');
        if (!fs.existsSync(knowledgePath)) return "DESCONOCIDO (No existe JSON)";

        const knowledge = JSON.parse(fs.readFileSync(knowledgePath, 'utf8'));
        const context = knowledge
            .filter(item => item.d.toUpperCase().includes(query.toUpperCase()))
            .map(item => item.d)
            .join('\n').substring(0, 3000);

        if (!process.env.GROQ_API_KEY) return "DESCONOCIDO (Falta API KEY)";

        const chat = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "Responde solo: HD, LD o DESCONOCIDO. Fuente: Catálogos Elimfilters." },
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