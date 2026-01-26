const fs = require('fs');
const path = require('path');
const Groq = require('groq-sdk');

// Inicialización segura de Groq
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

const getDutyClassification = async (query) => {
    try {
        if (!process.env.GROQ_API_KEY) {
            throw new Error('Falta la variable de entorno GROQ_API_KEY en Railway');
        }

        const knowledgePath = path.join(process.cwd(), 'src/knowledge/noteLLM.json');
        
        if (!fs.existsSync(knowledgePath)) {
            throw new Error('No se encuentra noteLLM.json en: ' + knowledgePath);
        }

        const knowledge = JSON.parse(fs.readFileSync(knowledgePath, 'utf8'));
        const searchTerm = query.toUpperCase().trim();
        
        // Filtramos contexto relevante
        const relevantContext = knowledge
            .filter(item => item.d.toUpperCase().includes(searchTerm))
            .map(item => "Catalogo: " + item.f + " | Datos: " + item.d)
            .join('\n\n')
            .substring(0, 3000);

        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "Eres un experto técnico de Elimfilters. Clasifica el filtro como HD (Heavy Duty) o LD (Light Duty) basado SOLO en el contexto provisto. Si no hay datos, responde 'DESCONOCIDO'."
                },
                {
                    role: "user",
                    content: "CONTEXTO TÉCNICO:\n" + (relevantContext || "No hay datos") + "\n\nPREGUNTA: ¿El código " + query + " es HD, LD o DESCONOCIDO?"
                }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.1,
        });

        return completion.choices[0]?.message?.content?.trim().toUpperCase() || "DESCONOCIDO";

    } catch (error) {
        console.error("❌ ERROR DETALLADO EN AI_SERVICE:", error.message);
        throw error; // Re-lanzamos para que el controlador lo atrape
    }
};

module.exports = { getDutyClassification };