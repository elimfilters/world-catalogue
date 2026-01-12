const Groq = require('groq-sdk');
const patterns = require('../data/manufacturer_patterns');
const { buildImprovedPrompt } = require('./improved_groq_prompt');

class ClassifierService {
  constructor() {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    this.patterns = patterns;
  }

  detectManufacturer(filterCode) {
    const code = filterCode.trim();
    for (const manufacturer of patterns.allManufacturers) {
      for (const pattern of manufacturer.patterns) {
        if (pattern.test(code)) {
          return {
            name: manufacturer.name,
            tier: manufacturer.tier || null,
            aliases: manufacturer.aliases,
            confidence: 'high'
          };
        }
      }
    }
    return null;
  }

  async classifyFilter(filterCode) {
    try {
      console.log(`🔍 Clasificando: ${filterCode}`);
      
      const detectedManufacturer = this.detectManufacturer(filterCode);
      console.log(`Fabricante detectado: ${detectedManufacturer?.name || 'Desconocido'}`);

      // USAR SOLO buildImprovedPrompt - Una sola estrategia
      const prompt = buildImprovedPrompt(filterCode, detectedManufacturer);

      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        max_tokens: 500
      });

      const content = completion.choices[0]?.message?.content || '{}';
      console.log(`📥 Respuesta GROQ: ${content.substring(0, 200)}...`);

      // Extraer JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No se encontró JSON en respuesta');
      }

      const result = JSON.parse(jsonMatch[0]);

      // Validar que duty sea HD o LD solamente
      if (!['HD', 'LD'].includes(result.duty)) {
        console.log(`⚠️ GROQ retornó duty inválido: ${result.duty}, rechazando`);
        throw new Error(`Duty inválido: ${result.duty}. Solo se acepta HD o LD`);
      }

      console.log(`✅ Clasificación exitosa: ${result.duty}`);

      return {
        ...result,
        detectedManufacturer,
        confidence: result.confidence || 'high'
      };

    } catch (error) {
      console.error('❌ Error en clasificación:', error.message);
      throw error;
    }
  }
}

module.exports = new ClassifierService();
