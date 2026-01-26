const fs = require('fs');
const path = require('path');
const Groq = require("groq-sdk");

// Cargar Base de Conocimiento (noteLLM.json)
let knowledgeBase = [];
try {
    const kbPath = path.join(__dirname, '../knowledge/noteLLM.json');
    if (fs.existsSync(kbPath)) {
        knowledgeBase = JSON.parse(fs.readFileSync(kbPath, 'utf8'));
        console.log(`🧠 Knowledge Base cargada: ${knowledgeBase.length} documentos.`);
    } else {
        console.warn('⚠️ noteLLM.json no encontrado. RAG deshabilitado.');
    }
} catch (error) {
    console.error('❌ Error cargando Knowledge Base:', error.message);
}

// Configurar Groq
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function getDutyClassification(query) {
    if (!process.env.GROQ_API_KEY) return "AI_DISABLED";

    // 1. Búsqueda simple en Knowledge Base (RAG)
    const relevantDocs = knowledgeBase
        .filter(doc => doc.datos_tecnicos.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 3) // Top 3 coincidencias
        .map(doc => doc.datos_tecnicos)
        .join("\n\n---\n\n");

    const context = relevantDocs ? `CONTEXTO TÉCNICO:\n${relevantDocs}` : "No hay contexto específico.";

    const prompt = `
    Eres un experto en filtros. Clasifica la aplicación del siguiente código: ${query}
    
    ${context}
    
    Responde solo con una de estas opciones: "HEAVY DUTY", "LIGHT DUTY", "INDUSTRIAL", "UNKNOWN".
    Si tienes duda, prioriza HEAVY DUTY.
    `;

    try {
        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-versatile",
            temperature: 0.1
        });
        return completion.choices[0]?.message?.content?.trim() || "UNKNOWN";
    } catch (error) {
        console.error("Groq Error:", error.message);
        return "ERROR";
    }
}

module.exports = { getDutyClassification };