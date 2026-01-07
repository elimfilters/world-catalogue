const Groq = require("groq-sdk");

class GroqService {
  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
    this.model = "llama-3.3-70b-versatile";
  }

  async classifyFilter(code, description = "", specs = {}) {
    console.log(`🧠 [GROQ] Clasificando: ${code}`);
    
    const prompt = `Analiza este filtro y determina:
1. Categoría (HEAVY_DUTY, LIGHT_DUTY, MARINE)
2. Tipo (AIR, OIL, FUEL, HYDRAULIC, COOLANT)
3. Aplicación principal

Código: ${code}
Descripción: ${description}
Specs: ${JSON.stringify(specs)}

Responde SOLO en JSON:
{
  "category": "HEAVY_DUTY|LIGHT_DUTY|MARINE",
  "filter_type": "AIR|OIL|FUEL|HYDRAULIC|COOLANT",
  "application": "descripción breve",
  "confidence": 0-100
}`;

    try {
      const completion = await this.groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: this.model,
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(completion.choices[0].message.content);
      console.log(`✅ [GROQ] Clasificado: ${result.category} - ${result.filter_type}`);
      return result;
      
    } catch (error) {
      console.error("❌ [GROQ] Error:", error.message);
      return null;
    }
  }

  async extractSpecs(htmlContent, code) {
    console.log(`🧠 [GROQ] Extrayendo specs de: ${code}`);
    
    const prompt = `Extrae las especificaciones técnicas de este filtro del HTML:

${htmlContent.substring(0, 3000)}

Busca: dimensiones, micrones, tipo de medio, aplicaciones, OEM cross-references.

Responde SOLO en JSON:
{
  "outer_diameter": "",
  "inner_diameter": "",
  "height": "",
  "thread": "",
  "micron_rating": "",
  "media_type": "",
  "gasket_type": "",
  "applications": []
}`;

    try {
      const completion = await this.groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: this.model,
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      return JSON.parse(completion.choices[0].message.content);
      
    } catch (error) {
      console.error("❌ [GROQ] Error extrayendo specs:", error.message);
      return null;
    }
  }
}

module.exports = new GroqService();
