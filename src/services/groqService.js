const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Clasifica un código de filtro como HD o LD.
 * Utiliza lógica técnica basada en aplicaciones y fabricantes.
 */
const classifyDuty = async (code) => {
    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "Eres un experto en filtración industrial y automotriz. Tu tarea es clasificar códigos de filtros en 'HD' (Heavy Duty: maquinaria pesada, camiones, motores diésel grandes) o 'LD' (Light Duty: autos de pasajeros, SUVs, motores pequeños). Responde ÚNICAMENTE con las letras 'HD' o 'LD'. No expliques. Si el código es ambiguo, prioriza HD para códigos industriales conocidos."
                },
                {
                    role: "user",
                    content: "Clasifica este código de filtro: " + code
                }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.1, // Baja temperatura para máxima precisión y cero inventiva
            max_tokens: 5
        });

        const result = chatCompletion.choices[0].message.content.trim().toUpperCase();
        
        // Validación de seguridad para asegurar que solo devuelva HD o LD
        return result.includes('HD') ? 'HD' : 'LD';
        
    } catch (error) {
        console.error("❌ Error en Clasificación GROQ:", error.message);
        // Fallback seguro: Si falla la IA, no asumimos nada (o podrías definir un default)
        throw new Error("No se pudo determinar el Duty del filtro.");
    }
};

module.exports = { classifyDuty };
