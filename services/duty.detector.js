// services/duty.detector.js - UPDATED VERSION
const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Patrones de códigos OEM que indican fabricante y DUTY
const OEM_PATTERNS = {
  // HEAVY DUTY (HD) - Caterpillar
  CATERPILLAR: {
    patterns: [
      /^1R\d{4}$/i,    // 1R####
      /^2P\d{4}$/i,    // 2P####
      /^3I\d{4}$/i,    // 3I####
      /^4N\d{4}$/i,    // 4N####
      /^5I\d{4}$/i,    // 5I####
      /^6I\d{4}$/i,    // 6I####
      /^7W\d{4}$/i,    // 7W####
      /^8N\d{4}$/i,    // 8N####
      /^9M\d{4}$/i     // 9M####
    ],
    duty: 'HD',
    manufacturer: 'Caterpillar'
  },
  
  // HEAVY DUTY (HD) - John Deere
  JOHN_DEERE: {
    patterns: [
      /^(RE|AR|AT|AM|AH)\d{5,6}$/i,  // RE####, AR####, etc.
      /^T\d{5,6}$/i                   // T#####
    ],
    duty: 'HD',
    manufacturer: 'John Deere'
  },
  
  // HEAVY DUTY (HD) - Komatsu
  KOMATSU: {
    patterns: [
      /^6[0-9]{2}-[0-9]{2}-[0-9]{4}$/,  // ###-##-####
      /^YM\d{6}$/i                       // YM######
    ],
    duty: 'HD',
    manufacturer: 'Komatsu'
  },
  
  // HEAVY DUTY (HD) - Case/New Holland
  CASE: {
    patterns: [
      /^(84|87|47)\d{5}$/,   // 84#####, 87#####
      /^CNH\d{6}$/i          // CNH######
    ],
    duty: 'HD',
    manufacturer: 'Case'
  },
  
  // HEAVY DUTY (HD) - Cummins
  CUMMINS: {
    patterns: [
      /^(FF|FS|LF|AF)\d{4,5}$/i  // FF####, FS####, LF####, AF####
    ],
    duty: 'HD',
    manufacturer: 'Cummins'
  },
  
  // HEAVY DUTY (HD) - Donaldson (directo)
  DONALDSON: {
    patterns: [
      /^P\d{6}$/i,      // P######
      /^X\d{6}$/i,      // X######
      /^DBA\d{4}$/i,    // DBA####
      /^DBP\d{4}$/i,    // DBP####
      /^G\d{6}$/i       // G######
    ],
    duty: 'HD',
    manufacturer: 'Donaldson'
  },
  
  // HEAVY DUTY (HD) - Baldwin
  BALDWIN: {
    patterns: [
      /^(B|BT|PA|PT|BF|RS)\d{3,5}$/i  // B###, BT####, PA####, etc.
    ],
    duty: 'HD',
    manufacturer: 'Baldwin'
  },
  
  // HEAVY DUTY (HD) - Fleetguard
  FLEETGUARD: {
    patterns: [
      /^(LF|FF|AF|HF|FS|WF|CS)\d{4,5}$/i  // LF####, FF####, etc.
    ],
    duty: 'HD',
    manufacturer: 'Fleetguard'
  }
};

// Listas de fabricantes para detección en texto
const HD_MANUFACTURERS = [
  'CATERPILLAR', 'CAT', 'JOHN DEERE', 'DEERE', 'KOMATSU', 'BOBCAT',
  'CASE', 'NEW HOLLAND', 'AGCO', 'MACK', 'FREIGHTLINER', 'VOLVO',
  'PERKINS', 'CUMMINS', 'DEUTZ', 'ATLAS COPCO', 'BANDIT', 'CLAAS',
  'PETERBILT', 'KENWORTH', 'INTERNATIONAL', 'TEREX', 'JCB', 'HITACHI',
  'LIEBHERR', 'DOOSAN', 'HYUNDAI HEAVY', 'KOBELCO', 'SUMITOMO'
];

const LD_MANUFACTURERS = [
  'FORD', 'TOYOTA', 'BMW', 'MERCEDES', 'BENZ', 'HONDA', 'NISSAN',
  'CHEVROLET', 'CHEVY', 'DODGE', 'VOLKSWAGEN', 'VW', 'HYUNDAI', 'KIA',
  'MAZDA', 'SUBARU', 'AUDI', 'LEXUS', 'ACURA', 'INFINITI', 'JEEP',
  'RAM', 'GMC', 'BUICK', 'CADILLAC', 'CHRYSLER', 'MITSUBISHI', 'SUZUKI'
];

function detectByPattern(code) {
  const cleanCode = code.trim().toUpperCase();
  
  for (const [brand, config] of Object.entries(OEM_PATTERNS)) {
    for (const pattern of config.patterns) {
      if (pattern.test(cleanCode)) {
        console.log('[DUTY] ✅ Pattern match found:', brand);
        return {
          duty: config.duty,
          manufacturer: config.manufacturer,
          confidence: 'high',
          method: 'pattern_match',
          pattern: pattern.source
        };
      }
    }
  }
  
  return null;
}

function extractManufacturerFromText(text) {
  if (!text) return null;

  const textUpper = text.toUpperCase();

  for (const mfg of HD_MANUFACTURERS) {
    if (textUpper.includes(mfg)) {
      return { name: mfg, duty: 'HD' };
    }
  }

  for (const mfg of LD_MANUFACTURERS) {
    if (textUpper.includes(mfg)) {
      return { name: mfg, duty: 'LD' };
    }
  }

  return null;
}

async function detectWithAI(code, specifications = {}) {
  try {
    console.log('[DUTY] Using AI for determination...');
    
    const prompt = `Analiza este codigo de filtro y determina si es Heavy Duty (HD) o Light Duty (LD).

Codigo: ${code}
Especificaciones: ${JSON.stringify(specifications)}

HD = Equipos industriales, maquinaria pesada, camiones (Caterpillar, John Deere, Komatsu, Mack, etc.)
LD = Vehiculos automotrices ligeros (Ford, Toyota, BMW, Honda, etc.)

Responde SOLO con JSON:
{"duty":"HD","confidence":"low","reason":"breve explicacion"}`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0
    });

    let response = completion.choices[0].message.content;
    response = response.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    const aiResult = JSON.parse(response);

    console.log('[DUTY] AI determination:', aiResult.duty);
    return {
      duty: aiResult.duty,
      confidence: 'low',
      method: 'ai',
      reason: aiResult.reason
    };

  } catch (error) {
    console.error('[DUTY] Error in AI detection:', error.message);
    return null;
  }
}

async function detectDuty(code, specifications = {}) {
  try {
    console.log('[DUTY] ==========================================');
    console.log('[DUTY] Starting detection for:', code);
    console.log('[DUTY] ==========================================');

    const patternResult = detectByPattern(code);
    if (patternResult) {
      console.log('[DUTY] ✅ DETECTED BY PATTERN');
      console.log('[DUTY]    - Manufacturer:', patternResult.manufacturer);
      console.log('[DUTY]    - DUTY:', patternResult.duty);
      console.log('[DUTY]    - Confidence:', patternResult.confidence);
      console.log('[DUTY] ==========================================');
      return patternResult;
    }

    if (specifications && Object.keys(specifications).length > 0) {
      const specsText = JSON.stringify(specifications).toUpperCase();
      const specsManufacturer = extractManufacturerFromText(specsText);

      if (specsManufacturer) {
        console.log('[DUTY] ✅ DETECTED FROM SPECIFICATIONS');
        console.log('[DUTY]    - Manufacturer:', specsManufacturer.name);
        console.log('[DUTY]    - DUTY:', specsManufacturer.duty);
        console.log('[DUTY] ==========================================');
        return {
          duty: specsManufacturer.duty,
          manufacturer: specsManufacturer.name,
          confidence: 'medium',
          method: 'specifications'
        };
      }
    }

    const aiResult = await detectWithAI(code, specifications);
    if (aiResult) {
      console.log('[DUTY] ✅ DETECTED BY AI');
      console.log('[DUTY]    - DUTY:', aiResult.duty);
      console.log('[DUTY]    - Confidence:', aiResult.confidence);
      console.log('[DUTY] ==========================================');
      return aiResult;
    }

    console.log('[DUTY] ⚠️ USING DEFAULT (HD)');
    console.log('[DUTY] ==========================================');
    return {
      duty: 'HD',
      manufacturer: 'Unknown',
      confidence: 'default',
      method: 'fallback',
      reason: 'Could not determine DUTY, defaulting to HD'
    };

  } catch (error) {
    console.error('[DUTY] ❌ Error in detection:', error.message);
    return {
      duty: 'HD',
      manufacturer: 'Unknown',
      confidence: 'default',
      method: 'fallback',
      reason: 'Error in detection, defaulting to HD'
    };
  }
}

module.exports = { detectDuty };
