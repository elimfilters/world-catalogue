const Groq = require('groq-sdk');
const { buildImprovedPrompt } = require('./improved_groq_prompt');

class ClassifierService {
  constructor() {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  detectManufacturer(filterCode) {
    const code = filterCode.trim().toUpperCase();
    
    // Patterns básicos embebidos
    const manufacturers = [
      { name: 'Caterpillar', patterns: [/^[1-9][A-Z]\d{4}$/], tier: 'OEM' },
      { name: 'Fleetguard', patterns: [/^[A-Z]{2}\d{4}/], tier: 1 },
      { name: 'Honda', patterns: [/^\d{5}-[A-Z0-9]{3}-[A-Z0-9]{3}$/], tier: 'OEM' },
      { name: 'Toyota', patterns: [/^(04152|90915)-/], tier: 'OEM' },
      { name: 'Hyundai', patterns: [/^26300-/], tier: 'OEM' },
      { name: 'Mann', patterns: [/^[A-Z]{2}\d{3}\/\d{1}[A-Z]?$/], tier: 1 }
    ];
    
    for (const mfg of manufacturers) {
      for (const pattern of mfg.patterns) {
        if (pattern.test(code)) {
          return {
            name: mfg.name,
            tier: mfg.tier,
            aliases: [mfg.name],
            confidence: 'high'
          };
        }
      }
    }
    
    return { name: 'Generic', tier: null, aliases: [], confidence: 'low' };
  }

  async classifyFilter(filterCode) {
    try {
      console.log(`🔍 Clasificando: ${filterCode}`);
      
      const detectedManufacturer = this.detectManufacturer(filterCode);
      console.log(`Fabricante detectado: ${detectedManufacturer.name}`);

      const prompt = buildImprovedPrompt(filterCode, detectedManufacturer);

      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        max_tokens: 500
      });

      const content = completion.choices[0]?.message?.content || '{}';
      console.log(`📥 Respuesta GROQ: ${content.substring(0, 200)}...`);

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No se encontró JSON en respuesta');
      }

      const result = JSON.parse(jsonMatch[0]);

      if (!['HD', 'LD'].includes(result.duty)) {
        console.log(`⚠️ Duty inválido: ${result.duty}`);
        throw new Error(`Duty inválido: ${result.duty}`);
      }

      console.log(`✅ Clasificado como: ${result.duty}`);

      return {
        ...result,
        detectedManufacturer,
        confidence: result.confidence || 'high'
      };

    } catch (error) {
      console.error('❌ Error:', error.message);
      throw error;
    }
  }
}

module.exports = new ClassifierService();
