const fs = require('fs');
const path = require('path');
const Groq = require('groq-sdk');

// Inicializamos Groq (Asegúrate de tener la variable de entorno GROQ_API_KEY)
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const getDutyClassification = async (query) => {
    try {
        // 1. Ubicamos el noteLLM.json (Tu base de 262 catálogos)
        const knowledgePath = path.join(__dirname, '../knowledge/noteLLM.json');
        
        if (!fs.existsSync(knowledgePath)) {
            console.error('⚠️ El archivo noteLLM.json no existe. Corre build_notellm.js primero.');
            return "DESCONOCIDO";
        }

        const knowledge = JSON.parse(fs.readFileSync(knowledgePath, 'utf8'));

        // 2. BUSCADOR TÉCNICO: Filtramos solo los datos que mencionen el código buscado
        const searchTerm = query.toUpperCase().trim();
        const relevantContext = knowledge
            .filter(item => item.d.toUpperCase().includes(searchTerm))
            .map(item => [Catalogo: \] Datos: \)
            .join('\n\n')
            .substring(0, 5000); // Evitamos saturar la memoria de la IA

        // 3. PROMPT DE INGENIERÍA: Prohibimos las adivinanzas
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "Eres un Ingeniero Senior de Filtración de Elimfilters. Tu única fuente de verdad son los datos proporcionados. Si el código no está en los datos o no hay evidencia clara, responde 'DESCONOCIDO'. No inventes bajo ninguna circunstancia."
                },
                {
                    role: "user",
                    content: DATOS DE CATÁLOGOS:\n\\n\nPREGUNTA:\nBasado únicamente en los datos anteriores, ¿el código "\" es 'HD' (Heavy Duty - Maquinaria/Camión) o 'LD' (Light Duty - Automóvil)?\n\nResponde solo con las siglas: HD, LD o DESCONOCIDO.
                }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.1, // Temperatura baja para máxima precisión técnica
        });

        const respuesta = completion.choices[0]?.message?.content?.trim().toUpperCase() || "DESCONOCIDO";
        console.log(\🤖 Groq analizó \ usando noteLLM y determinó: \\);
        
        return respuesta;

    } catch (error) {
        console.error("❌ Error en el motor de IA:", error.message);
        return "DESCONOCIDO";
    }
};

module.exports = { getDutyClassification };