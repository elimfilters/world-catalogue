const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Listas de fabricantes
const HD_MANUFACTURERS = [
  'CATERPILLAR', 'CAT', 'JOHN DEERE', 'DEERE', 'KOMATSU', 'BOBCAT',
  'CASE', 'NEW HOLLAND', 'AGCO', 'MACK', 'FREIGHTLINER', 'VOLVO',
  'PERKINS', 'CUMMINS', 'DEUTZ', 'ATLAS COPCO', 'BANDIT', 'CLAAS'
];

const LD_MANUFACTURERS = [
  'FORD', 'TOYOTA', 'BMW', 'MERCEDES', 'BENZ', 'HONDA', 'NISSAN',
  'CHEVROLET', 'CHEVY', 'DODGE', 'VOLKSWAGEN', 'VW', 'HYUNDAI', 'KIA',
  'MAZDA', 'SUBARU', 'AUDI', 'LEXUS', 'ACURA', 'INFINITI'
];

async function detectDuty(code, specifications = {}) {
  try {
    // Primero, detección por prefijo del código
    const codeUpper = code.toUpperCase();
    
    // Códigos típicos HD
    if (codeUpper.match(/^(1R|2P|3I|RE|AR|AT|6I|YM|P\d)/)) {
      return { duty: 'HD', confidence: 'high', method: 'code_pattern' };
    }
    
    // Códigos típicos LD
    if (codeUpper.match(/^(PH|CH|CS|BG|WIX|PUROLATOR)/)) {
      return { duty: 'LD', confidence: 'high', method: 'code_pattern' };
    }
    
    // Detección por fabricante en especificaciones
    const specsText = JSON.stringify(specifications).toUpperCase();
    
    for (const mfg of HD_MANUFACTURERS) {
      if (specsText.includes(mfg)) {
        return { duty: 'HD', confidence: 'medium', method: 'manufacturer', manufacturer: mfg };
      }
    }
    
    for (const mfg of LD_MANUFACTURERS) {
      if (specsText.includes(mfg)) {
        return { duty: 'LD', confidence: 'medium', method: 'manufacturer', manufacturer: mfg };
      }
    }
    
    // Si no se puede determinar, usar AI como último recurso
    console.log('🤖 Usando AI para determinar DUTY...');
    
    const prompt = `Analiza este código de filtro y determina si es Heavy Duty (HD) o Light Duty (LD).

Código: ${code}
Especificaciones: ${JSON.stringify(specifications)}

HD = Equipos industriales, maquinaria pesada, camiones (Caterpillar, John Deere, Komatsu, Mack, etc.)
LD = Vehículos automotrices ligeros (Ford, Toyota, BMW, Honda, etc.)

Responde SOLO con JSON:
{"duty":"HD","confidence":"low","reason":"breve explicación"}`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0
    });

    let response = completion.choices[0].message.content;
    response = response.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    const aiResult = JSON.parse(response);
    
    return {
      duty: aiResult.duty,
      confidence: 'low',
      method: 'ai',
      reason: aiResult.reason
    };
    
  } catch (error) {
    console.error('DUTY detection error:', error.message);
    // Default a HD si falla
    return { duty: 'HD', confidence: 'default', method: 'fallback' };
  }
}

module.exports = { detectDuty };