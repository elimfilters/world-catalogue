const Groq = require('groq-sdk');
const { detectDuty } = require('./duty.detector');
const { performCrossReference } = require('./crossReference.service');
const skuGenerator = require('./sku.generator');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const FILTER_CATEGORIES = {
  AIR: { prefix: 'EA1', pattern: /air|intake|cabin air|engine air/i, duties: ['HD', 'LD'], tech: 'MACROCORE' },
  FUEL: { prefix: 'EF9', pattern: /fuel|diesel|gasoline|petrol/i, duties: ['HD', 'LD'], tech: 'NANOFORCE' },
  CABIN: { prefix: 'EC1', pattern: /cabin|hvac|interior/i, duties: ['HD', 'LD'], tech: 'MICROKAPPA' },
  HYDRAULIC: { prefix: 'EH6', pattern: /hydraulic|hyd|transmission oil/i, duties: ['HD'], tech: 'SYNTEPORE' },
  OIL: { prefix: 'EL8', pattern: /oil|lube|lubricant|engine oil/i, duties: ['HD', 'LD'], tech: 'SYNTRAX' },
  COOLANT: { prefix: 'EW7', pattern: /coolant|water|radiator/i, duties: ['HD'], tech: 'COOLTECH' },
  MARINE: { prefix: 'EM9', pattern: /marine|marina|boat|naval/i, duties: ['HD', 'LD'], tech: 'MARINEGUARD' },
  TURBINE: { prefix: 'ET9', pattern: /turbine|turbina|turbo/i, duties: ['HD'], tech: 'AQUAGUARD' },
  AIR_DRYER: { prefix: 'ED4', pattern: /air dryer|dryer|brake air|compressed air/i, duties: ['HD'], tech: 'DRYCORE' },
  FUEL_SEPARATOR: { prefix: 'ES9', pattern: /fuel separator|water separator|fuel water/i, duties: ['HD'], tech: 'AQUAGUARD' },
  KIT_HD: { prefix: 'EK5', pattern: /kit|maintenance kit|service kit|filter kit/i, duties: ['HD'], tech: 'DURATECH' },
  KIT_LD: { prefix: 'EK3', pattern: /kit|maintenance kit|service kit|filter kit/i, duties: ['LD'], tech: 'DURATECH' }
};

class ClassifierService {
  async processFilter(filterCode) {
    console.log('[Classifier] Starting full process for:', filterCode);

    try {
      // Primero hacer cross-reference para obtener specs
      

      

      let finalSKU = crossRefResult.elimfiltersSKU;
      let finalSeries = crossRefResult.elimfiltersSeries;

      if (!finalSKU && crossRefResult.crossReferenceCode) {
        const skuData = skuGenerator.generate(
          crossRefResult.crossReferenceCode,
          classification.type,
          'PERFORMANCE'
        );
        finalSKU = skuData.sku;
      }

      if (!finalSKU) {
        const skuData = skuGenerator.generateDirect(
          filterCode,
          classification.type,
          'STANDARD'
        );
        finalSKU = skuData.sku;
        finalSeries = 'STANDARD';
      }

      console.log('[Classifier] Final SKU:', finalSKU);

      return {
        filterCode,
        elimfiltersSKU: finalSKU,
        elimfiltersPrefix: classification.prefix,
        filterType: classification.type,
        duty: dutyResult.duty,
        technology: classification.tech,
        elimfiltersSeries: finalSeries || 'STANDARD',
        crossReferenceCode: crossRefResult.crossReferenceCode,
        manufacturer: dutyResult.duty === 'HD' ? 'Caterpillar' : 'Toyota',
        confidence: classification.confidence,
        dutyDetection: dutyResult,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('[Classifier] Error in processFilter:', error.message);
      throw error;
    }
  }

  async classifyFilter(filterCode, context = {}) {
    try {
      console.log('[Classifier] Classifying:', filterCode);

      const quickMatch = this.quickClassify(filterCode, context);
      if (quickMatch.confidence > 0.7) {
        console.log('[Classifier] Quick match:', quickMatch.type, quickMatch.confidence);
        return quickMatch;
      }

      const groqResult = await this.groqClassify(filterCode, context);
      console.log('[Classifier] GROQ result:', groqResult.type, groqResult.confidence);

      return groqResult;
    } catch (error) {
      console.error('[Classifier] Error:', error.message);
      return this.getFallbackClassification(filterCode);
    }
  }

  quickClassify(filterCode, context) {
    const searchText = (filterCode + ' ' + (context.description || '') + ' ' + (context.application || '')).toLowerCase();

    let bestMatch = { type: 'OIL', confidence: 0.3, duty: 'HD', prefix: 'EL8', tech: 'SYNTRAX' };

    for (const [type, config] of Object.entries(FILTER_CATEGORIES)) {
      if (config.pattern.test(searchText)) {
        const confidence = this.calculateConfidence(searchText, config.pattern);
        if (confidence > bestMatch.confidence) {
          bestMatch = {
            type,
            confidence,
            duty: config.duties[0],
            prefix: config.prefix,
            tech: config.tech
          };
        }
      }
    }

    return bestMatch;
  }

  async groqClassify(filterCode, context) {
    const specs = context.especificaciones || {};
    const desc = context.descripcion || '';
    const alts = context.productosAlternativos || [];
    
    const prompt = `Classify this filter code: ${filterCode}

TECHNICAL SPECIFICATIONS FROM MANUFACTURER:
Description: ${desc}
Specifications: ${JSON.stringify(specs, null, 2)}
Alternative Products: ${JSON.stringify(alts)}

Based on these TECHNICAL SPECIFICATIONS (not the code), determine the filter type.

Categories:
- AIR (EA1): Air filters - MACROCORE
- FUEL (EF9): Fuel filters - NANOFORCE
- CABIN (EC1): Cabin filters - MICROKAPPA
- HYDRAULIC (EH6): Hydraulic filters - SYNTEPORE
- OIL (EL8): Oil/Lube filters - SYNTRAX
- COOLANT (EW7): Coolant filters - COOLTECH
- MARINE (EM9): Marine filters - MARINEGUARD
- TURBINE (ET9): Turbine filters - AQUAGUARD
- AIR_DRYER (ED4): Air dryer filters - DRYCORE
- FUEL_SEPARATOR (ES9): Fuel separators - AQUAGUARD
- KIT_HD (EK5): HD maintenance kits - DURATECH
- KIT_LD (EK3): LD maintenance kits - DURATECH

Respond with JSON only:\n{\n  "type": "category name",\n  "confidence": 0.0-1.0,\n  "duty": "HD or LD",\n  "reasoning": "brief explanation"\n}';

    const response = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      max_tokens: 200
    });

    const result = JSON.parse(response.choices[0].message.content.trim());
    const category = FILTER_CATEGORIES[result.type] || FILTER_CATEGORIES.OIL;

    return {
      type: result.type,
      confidence: result.confidence,
      duty: result.duty,
      prefix: category.prefix,
      tech: category.tech,
      reasoning: result.reasoning
    };
  }

  calculateConfidence(text, pattern) {
    const matches = text.match(pattern);
    return matches ? Math.min(0.9, 0.6 + (matches.length * 0.1)) : 0.3;
  }

  getFallbackClassification(filterCode) {
    return {
      type: 'OIL',
      confidence: 0.3,
      duty: 'HD',
      prefix: 'EL8',
      tech: 'SYNTRAX',
      reasoning: 'Default classification'
    };
  }
}

module.exports = new ClassifierService();



