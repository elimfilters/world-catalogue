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

  async classifyWithGroq(filterCode, manufacturerHint = null) {
    try {
      const detectedManufacturer = this.detectManufacturer(filterCode);
      const prompt = `Clasifica este código de filtro: ${filterCode}
${detectedManufacturer ? `Fabricante detectado: ${detectedManufacturer.name}` : ''}
${manufacturerHint ? `Pista del fabricante: ${manufacturerHint}` : ''}

REGLAS DE CLASIFICACIÓN ELIMFILTERS:
1. DUTY (Heavy vs Light):
   - Heavy Duty (HD): Equipos industriales, construcción, minería, camiones clase 8, marina, agricultura
   - Light Duty (LD): Automóviles, SUVs, pickups ligeras, motocicletas

2. TIPOS DE FILTRO:
   - OIL: Filtros de aceite de motor
   - AIR: Filtros de aire primarios
   - CABIN: Filtros de cabina/aire acondicionado
   - FUEL: Filtros de combustible (diesel/gasolina)
   - HYDRO: Filtros hidráulicos
   - TRANS: Filtros de transmisión
   - COOL: Filtros de refrigerante
   - FUEL_WATER: Separadores agua/combustible
   - AIR_SAFETY: Filtros de seguridad de aire
   - BREATHER: Filtros respiraderos

3. PREFIJOS ELIMFILTERS (SKU):
   Heavy Duty Oil: ESO (Standard SYNTRAX™), EPO (Premium NANOFORCE™), EHO (High-Performance SYNTEPORE™)
   Heavy Duty Air: ESA, EPA, EHA
   Heavy Duty Fuel: ESF, EPF, EHF
   Heavy Duty Cabin: ESC, EPC, EHC
   Marine: EMO (Marine Oil MARINEGUARD™), EMA, EMF (AQUAGUARD™), EMC
   Light Duty Oil: ELO, ELOP, ELOH

Responde SOLO en formato JSON:
{
  "filterType": "OIL/AIR/FUEL/etc",
  "duty": "HD/LD",
  "elimfiltersPrefix": "ESO/EPO/EHO/etc",
  "technology": "SYNTRAX™/NANOFORCE™/SYNTEPORE™/MARINEGUARD™/AQUAGUARD™/Standard",
  "confidence": "high/medium/low",
  "reasoning": "explicación breve"
}`;

      const completion = await this.groq.chat.completions.create({
        messages: [
          { role: 'system', content: 'Eres un experto en clasificación de filtros industriales. Responde SOLO en formato JSON válido.' },
          { role: 'user', content: prompt }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        max_tokens: 500
      });

      const response = completion.choices[0]?.message?.content || '';
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No se pudo extraer JSON de la respuesta');
      const classification = JSON.parse(jsonMatch[0]);
      
      return {
        filterCode,
        manufacturer: detectedManufacturer?.name || manufacturerHint || 'Unknown',
        ...classification,
        detectedManufacturer
      };
    } catch (error) {
      console.error('Error clasificando con GROQ:', error);
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
      const classification = await this.classifyWithGroq(filterCode, manufacturerHint);
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
        detectedManufacturer: classification.detectedManufacturer
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
