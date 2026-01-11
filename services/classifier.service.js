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

    const validPrefixes = ['ESO', 'EPO', 'EHO', 'ESA', 'EPA', 'EHA', 'ESF', 'EPF', 'EHF', 
                          'ESC', 'EPC', 'EHC', 'ESH', 'EPH', 'EHH', 'EMO', 'EMA', 'EMF', 
                          'EMC', 'ELO', 'ELOP', 'ELOH', 'ELA', 'ELC', 'ELF'];
    if (validPrefixes.includes(result.elimfiltersPrefix)) {
      score += 40;
      details.validPrefix = true;
    } else {
      details.validPrefix = false;
      details.invalidPrefix = result.elimfiltersPrefix;
    }

    const validTypes = ['OIL', 'AIR', 'CABIN', 'FUEL', 'HYDRO', 'TRANS', 'COOL', 
                       'FUEL_WATER', 'AIR_SAFETY', 'BREATHER'];
    if (validTypes.includes(result.filterType)) {
      score += 20;
      details.validType = true;
    }

    if (['HD', 'LD'].includes(result.duty)) {
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
- DUTY: HD (equipos industriales, camiones clase 8, construcción, minería, marina) o LD (autos, SUVs, pickups)
- TIPOS: OIL, AIR, CABIN, FUEL, HYDRO, TRANS, COOL, FUEL_WATER, AIR_SAFETY, BREATHER
- PREFIJOS HD: ESO/EPO/EHO (Oil), ESA/EPA/EHA (Air), ESF/EPF/EHF (Fuel), ESC/EPC/EHC (Cabin), ESH/EPH/EHH (Hydro)
- PREFIJOS Marina: EMO (Oil), EMA (Air), EMF (Fuel), EMC (Cabin)
- PREFIJOS LD: ELO/ELOP/ELOH (Oil), ELA (Air), ELC (Cabin), ELF (Fuel)
- TECNOLOGÍAS: SYNTRAX™ (Standard), NANOFORCE™ (Premium), SYNTEPORE™ (High-Performance), MARINEGUARD™, AQUAGUARD™

Responde SOLO JSON válido:
{"filterType":"OIL","duty":"HD","elimfiltersPrefix":"ESO","technology":"SYNTRAX™","confidence":"high","reasoning":"breve explicación"}`;

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

Clasifica en JSON:
- filterType: OIL/AIR/FUEL/CABIN/HYDRO/TRANS/COOL/FUEL_WATER/AIR_SAFETY/BREATHER
- duty: HD (industrial/camiones) o LD (autos)
- elimfiltersPrefix: Para HD Oil usa ESO (standard), EPO (premium) o EHO (performance). Para HD Air: ESA/EPA/EHA. Para HD Fuel: ESF/EPF/EHF
- technology: SYNTRAX™/NANOFORCE™/SYNTEPORE™/Standard
- confidence: high/medium/low
- reasoning: breve

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

EJEMPLOS:
- P551329 (Donaldson fuel HD) → {"filterType":"FUEL","duty":"HD","elimfiltersPrefix":"ESF","technology":"Standard","confidence":"high"}
- 1R-0750 (CAT oil HD) → {"filterType":"OIL","duty":"HD","elimfiltersPrefix":"ESO","technology":"SYNTRAX™","confidence":"high"}
- LF3000 (Fleetguard oil HD) → {"filterType":"OIL","duty":"HD","elimfiltersPrefix":"EPO","technology":"NANOFORCE™","confidence":"high"}

PREFIJOS VÁLIDOS:
HD: ESO,EPO,EHO (oil), ESA,EPA,EHA (air), ESF,EPF,EHF (fuel), ESC,EPC,EHC (cabin), ESH,EPH,EHH (hydro)
LD: ELO,ELOP,ELOH (oil), ELA (air), ELF (fuel), ELC (cabin)
Marina: EMO (oil), EMA (air), EMF (fuel), EMC (cabin)

Responde JSON idéntico al ejemplo. Sin markdown.`;

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
      const byManufacturer = await FilterClassification.aggregate([
        { $group: { _id: '$manufacturer', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ]);
      return { total, byDuty, byType, topManufacturers: byManufacturer };
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  }
}

module.exports = new ClassifierService();
