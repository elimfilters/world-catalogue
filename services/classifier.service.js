const Groq = require('groq-sdk');
const FilterClassification = require('../models/FilterClassification');
const patterns = require('./patterns');

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

  evaluateClassification(result, detectedManufacturer) {
    let score = 0;
    const details = {};

    // ✅ 13 PREFIJOS ESPECIALIZADOS ELIMFILTERS
    const validPrefixes = [
      'EA1',  // Air - MACROCORE™
      'EA2',  // Air Filter Housings
      'EF9',  // Fuel - NANOFORCE™
      'ES9',  // Fuel/Water Separator - AQUAGUARD™
      'EC1',  // Cabin - MICROKAPPA™
      'EH6',  // Hydraulic - SYNTEPORE™
      'EL8',  // Oil - SYNTRAX™
      'EW7',  // Coolant - COOLTECH™
      'EM9',  // Marina - MARINEGUARD™
      'ET9',  // Turbinas - TURBOSHIELD™
      'ED4',  // Air Dryer - DRYCORE™
      'EK5',  // Kits HD
      'EK3'   // Kits LD
    ];
    
    if (validPrefixes.includes(result.elimfiltersPrefix)) {
      score += 40;
      details.validPrefix = true;
    } else {
      details.validPrefix = false;
      details.invalidPrefix = result.elimfiltersPrefix;
    }

    const validTypes = [
      'OIL', 'AIR', 'CABIN', 'FUEL', 'HYDRO', 'COOLANT',
      'MARINE', 'TURBINE', 'AIR_DRYER', 'AIR_HOUSING', 
      'FUEL_SEPARATOR', 'KIT'
    ];
    
    if (validTypes.includes(result.filterType)) {
      score += 20;
      details.validType = true;
    }

    if (['HD', 'LD', 'HD/LD'].includes(result.duty)) {
      score += 15;
      details.validDuty = true;
    }

    if (result.confidence === 'high') score += 15;
    else if (result.confidence === 'medium') score += 10;
    else if (result.confidence === 'low') score += 5;
    details.confidence = result.confidence;

    if (detectedManufacturer && result.manufacturer === detectedManufacturer.name) {
      score += 10;
      details.manufacturerMatch = true;
    }

    details.totalScore = score;
    return { score, details };
  }

  async strategy1(filterCode, detectedManufacturer) {
    const prompt = `Clasifica este código de filtro: ${filterCode}
${detectedManufacturer ? `Fabricante: ${detectedManufacturer.name}` : ''}

REGLAS ELIMFILTERS:

DUTY:
- HD: Heavy Duty (camiones, construcción, minería, equipos industriales)
- LD: Light Duty (autos, SUVs, pickups ligeros)
- HD/LD: Flexible (aplica para ambos)

PREFIJOS Y TECNOLOGÍAS (13 Series):

1. EA1 - Air (HD/LD) → MACROCORE™
   Air filters for engines, compressors
   Equivalent: Donaldson Ultraweb/PowerCore

2. EA2 - Air Filter Housings (HD)
   Air filter housings and assemblies

3. EF9 - Fuel (HD/LD) → NANOFORCE™
   Premium fuel filters

4. ES9 - Fuel/Water Separator (HD) → AQUAGUARD™
   Fuel water separators

5. EC1 - Cabin (HD/LD) → MICROKAPPA™
   Specialized cabin air filters

6. EH6 - Hydraulic (HD) → SYNTEPORE™
   High-pressure hydraulic filters

7. EL8 - Oil (HD/LD) → SYNTRAX™
   Oil filters - Equivalent: Donaldson Synteq™

8. EW7 - Coolant (HD) → COOLTECH™
   Coolant filters

9. EM9 - Marina (HD/LD) → MARINEGUARD™
   Marine application filters

10. ET9 - Turbines (HD) → TURBOSHIELD™
    Turbine filters

11. ED4 - Air Dryer (HD) → DRYCORE™
    Air dryer filters

12. EK5 - Filter Kits (HD)
    Complete filter kits for heavy duty

13. EK3 - Filter Kits (LD)
    Complete filter kits for light duty

TIPOS VÁLIDOS:
OIL, AIR, CABIN, FUEL, HYDRO, COOLANT, MARINE, TURBINE, AIR_DRYER, AIR_HOUSING, FUEL_SEPARATOR, KIT

Responde SOLO JSON válido:
{"filterType":"FUEL_SEPARATOR","duty":"HD","elimfiltersPrefix":"ES9","technology":"AQUAGUARD™","confidence":"high","reasoning":"breve explicación"}`;

    const completion = await this.groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'Experto en filtros industriales. Responde SOLO JSON válido, sin markdown.' },
        { role: 'user', content: prompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      max_tokens: 300
    });

    return this.parseGroqResponse(completion);
  }

  async strategy2(filterCode, detectedManufacturer) {
    const prompt = `Código: ${filterCode}
${detectedManufacturer ? `Marca: ${detectedManufacturer.name}` : ''}

Clasifica usando ELIMFILTERS:

filterType: OIL | AIR | CABIN | FUEL | HYDRO | COOLANT | MARINE | TURBINE | AIR_DRYER | AIR_HOUSING | FUEL_SEPARATOR | KIT
duty: HD | LD | HD/LD

Mapeo:
- EL8 (SYNTRAX™) → Oil
- EA1 (MACROCORE™) → Air  
- EA2 → Air Filter Housing
- EF9 (NANOFORCE™) → Fuel
- ES9 (AQUAGUARD™) → Fuel/Water Separator
- EC1 (MICROKAPPA™) → Cabin
- EH6 (SYNTEPORE™) → Hydraulic
- EW7 (COOLTECH™) → Coolant
- EM9 (MARINEGUARD™) → Marine
- ET9 (TURBOSHIELD™) → Turbine
- ED4 (DRYCORE™) → Air Dryer
- EK5 → Filter Kits HD
- EK3 → Filter Kits LD

Responde JSON:
{"filterType":"...","duty":"...","elimfiltersPrefix":"...","technology":"...","confidence":"high/medium/low","reasoning":"..."}

Solo JSON, sin markdown.`;

    const completion = await this.groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'Responde solo JSON limpio.' },
        { role: 'user', content: prompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      max_tokens: 250
    });

    return this.parseGroqResponse(completion);
  }

  async strategy3(filterCode, detectedManufacturer) {
    const prompt = `Código de filtro: ${filterCode}
${detectedManufacturer ? `Fabricante: ${detectedManufacturer.name}` : ''}

EJEMPLOS ELIMFILTERS:

Oil:
- P551329 (Donaldson) → {"filterType":"OIL","duty":"HD/LD","elimfiltersPrefix":"EL8","technology":"SYNTRAX™","confidence":"high"}
- 1R-0750 (CAT) → {"filterType":"OIL","duty":"HD","elimfiltersPrefix":"EL8","technology":"SYNTRAX™","confidence":"high"}

Air:
- P181050 (Donaldson) → {"filterType":"AIR","duty":"HD","elimfiltersPrefix":"EA1","technology":"MACROCORE™","confidence":"high"}
- AF25454 (Fleetguard) → {"filterType":"AIR","duty":"HD/LD","elimfiltersPrefix":"EA1","technology":"MACROCORE™","confidence":"high"}

Air Housing:
- AH19037 → {"filterType":"AIR_HOUSING","duty":"HD","elimfiltersPrefix":"EA2","technology":"N/A","confidence":"high"}

Fuel:
- FS19532 (Fleetguard) → {"filterType":"FUEL","duty":"HD/LD","elimfiltersPrefix":"EF9","technology":"NANOFORCE™","confidence":"high"}

Fuel Separator:
- FS19765 (Fleetguard) → {"filterType":"FUEL_SEPARATOR","duty":"HD","elimfiltersPrefix":"ES9","technology":"AQUAGUARD™","confidence":"high"}
- P551004 (Donaldson) → {"filterType":"FUEL_SEPARATOR","duty":"HD","elimfiltersPrefix":"ES9","technology":"AQUAGUARD™","confidence":"high"}

Cabin:
- P608667 → {"filterType":"CABIN","duty":"HD/LD","elimfiltersPrefix":"EC1","technology":"MICROKAPPA™","confidence":"high"}

Hydraulic:
- P164378 → {"filterType":"HYDRO","duty":"HD","elimfiltersPrefix":"EH6","technology":"SYNTEPORE™","confidence":"high"}

Coolant:
- WF2075 → {"filterType":"COOLANT","duty":"HD","elimfiltersPrefix":"EW7","technology":"COOLTECH™","confidence":"high"}

Marine:
- LF3594 → {"filterType":"MARINE","duty":"HD/LD","elimfiltersPrefix":"EM9","technology":"MARINEGUARD™","confidence":"high"}

Turbine:
- Gas Turbine → {"filterType":"TURBINE","duty":"HD","elimfiltersPrefix":"ET9","technology":"TURBOSHIELD™","confidence":"high"}

Air Dryer:
- AD27750 → {"filterType":"AIR_DRYER","duty":"HD","elimfiltersPrefix":"ED4","technology":"DRYCORE™","confidence":"high"}

Kits:
- LK3116 → {"filterType":"KIT","duty":"HD","elimfiltersPrefix":"EK5","technology":"N/A","confidence":"high"}
- TK316 → {"filterType":"KIT","duty":"LD","elimfiltersPrefix":"EK3","technology":"N/A","confidence":"high"}

MAPEO SIMPLE:
Oil → EL8 (SYNTRAX™)
Air → EA1 (MACROCORE™)
Air Housing → EA2
Fuel → EF9 (NANOFORCE™)
Fuel Separator → ES9 (AQUAGUARD™)
Cabin → EC1 (MICROKAPPA™)
Hydraulic → EH6 (SYNTEPORE™)
Coolant → EW7 (COOLTECH™)
Marine → EM9 (MARINEGUARD™)
Turbine → ET9 (TURBOSHIELD™)
Air Dryer → ED4 (DRYCORE™)
Kit HD → EK5
Kit LD → EK3

Responde JSON exacto. Sin markdown.`;

    const completion = await this.groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'Clasifica filtros siguiendo los ejemplos exactamente. Solo JSON.' },
        { role: 'user', content: prompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.05,
      max_tokens: 200
    });

    return this.parseGroqResponse(completion);
  }

  parseGroqResponse(completion) {
    const response = completion.choices[0]?.message?.content || '';
    const cleaned = response.replace(/```json|```/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON encontrado');
    return JSON.parse(jsonMatch[0]);
  }

  async classifyWithMatrix(filterCode, manufacturerHint = null) {
    try {
      const detectedManufacturer = this.detectManufacturer(filterCode);
      const results = [];

      console.log(`\n🎯 Clasificando: ${filterCode}`);
      console.log(`📍 Fabricante detectado: ${detectedManufacturer?.name || 'Ninguno'}\n`);

      const strategies = [
        { name: 'Detallado', fn: this.strategy1.bind(this) },
        { name: 'Simplificado', fn: this.strategy2.bind(this) },
        { name: 'Por Ejemplos', fn: this.strategy3.bind(this) }
      ];

      for (const strategy of strategies) {
        try {
          console.log(`⚙️  Ejecutando estrategia: ${strategy.name}...`);
          const result = await strategy.fn(filterCode, detectedManufacturer);
          const evaluation = this.evaluateClassification(result, detectedManufacturer);
          
          results.push({
            strategy: strategy.name,
            result,
            evaluation,
            score: evaluation.score
          });
          
          console.log(`   Score: ${evaluation.score}/100`);
        } catch (error) {
          console.log(`   ❌ Error: ${error.message}`);
          results.push({
            strategy: strategy.name,
            error: error.message,
            score: 0
          });
        }
      }

      results.sort((a, b) => b.score - a.score);
      const best = results[0];

      console.log(`\n🏆 Mejor resultado: ${best.strategy} (${best.score}/100)\n`);

      if (best.score < 50) {
        throw new Error('Todos los intentos obtuvieron score bajo (<50)');
      }

      return {
        filterCode,
        manufacturer: detectedManufacturer?.name || manufacturerHint || 'Unknown',
        ...best.result,
        detectedManufacturer,
        matrix: results.map(r => ({
          strategy: r.strategy,
          score: r.score,
          details: r.evaluation?.details,
          error: r.error
        })),
        selectedStrategy: best.strategy,
        finalScore: best.score
      };

    } catch (error) {
      console.error('Error en clasificación con matriz:', error);
      throw error;
    }
  }

  generateSKU(classification) {
    const prefix = classification.elimfiltersPrefix;
    const timestamp = Date.now().toString().slice(-6);
    const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp}${randomSuffix}`;
  }

  async saveClassification(classificationData) {
    try {
      const classification = new FilterClassification(classificationData);
      await classification.save();
      return classification;
    } catch (error) {
      console.error('Error guardando clasificación:', error);
      throw error;
    }
  }

  async processFilter(filterCode, manufacturerHint = null) {
    try {
      const classification = await this.classifyWithMatrix(filterCode, manufacturerHint);
      const elimfiltersSKU = this.generateSKU(classification);
      
      const fullClassification = {
        originalCode: filterCode,
        manufacturer: classification.manufacturer,
        filterType: classification.filterType,
        duty: classification.duty,
        elimfiltersPrefix: classification.elimfiltersPrefix,
        elimfiltersSKU,
        technology: classification.technology,
        confidence: classification.confidence,
        reasoning: classification.reasoning,
        detectedManufacturer: classification.detectedManufacturer,
        evaluationMatrix: classification.matrix,
        selectedStrategy: classification.selectedStrategy,
        finalScore: classification.finalScore
      };
      
      const saved = await this.saveClassification(fullClassification);
      return { success: true, classification: saved };
    } catch (error) {
      console.error('Error procesando filtro:', error);
      return { success: false, error: error.message };
    }
  }

  async processBatch(filterCodes) {
    const results = [];
    for (const code of filterCodes) {
      const result = await this.processFilter(code);
      results.push(result);
    }
    return results;
  }

  async findClassifications(query = {}) {
    try {
      return await FilterClassification.find(query);
    } catch (error) {
      console.error('Error buscando clasificaciones:', error);
      throw error;
    }
  }

  async getStats() {
    try {
      const total = await FilterClassification.countDocuments();
      const byDuty = await FilterClassification.aggregate([
        { $group: { _id: '$duty', count: { $sum: 1 } } }
      ]);
      const byType = await FilterClassification.aggregate([
        { $group: { _id: '$filterType', count: { $sum: 1 } } }
      ]);
      const byPrefix = await FilterClassification.aggregate([
        { $group: { _id: '$elimfiltersPrefix', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
      const byTechnology = await FilterClassification.aggregate([
        { $group: { _id: '$technology', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
      const byManufacturer = await FilterClassification.aggregate([
        { $group: { _id: '$manufacturer', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ]);
      return { total, byDuty, byType, byPrefix, byTechnology, topManufacturers: byManufacturer };
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  }
}

module.exports = new ClassifierService();
