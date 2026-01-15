const Groq = require('groq-sdk');

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
  async classifyFilter(filterCode, context = {}) {
    try {
      console.log('[Classifier] Processing:', filterCode);

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
    const prompt = 'Classify this filter code: ' + filterCode + '\n\nContext: ' + JSON.stringify(context) + '\n\nCategories:\n- AIR (EA1): Air filters - MACROCORE\n- FUEL (EF9): Fuel filters - NANOFORCE\n- CABIN (EC1): Cabin filters - MICROKAPPA\n- HYDRAULIC (EH6): Hydraulic filters - SYNTEPORE\n- OIL (EL8): Oil filters - SYNTRAX\n- COOLANT (EW7): Coolant filters - COOLTECH\n- MARINE (EM9): Marine filters - MARINEGUARD\n- TURBINE (ET9): Turbine filters - AQUAGUARD\n- AIR_DRYER (ED4): Air dryer filters - DRYCORE\n- FUEL_SEPARATOR (ES9): Fuel separators - AQUAGUARD\n- KIT_HD (EK5): HD maintenance kits - DURATECH\n- KIT_LD (EK3): LD maintenance kits - DURATECH\n\nRespond with JSON only:\n{\n  "type": "category name",\n  "confidence": 0.0-1.0,\n  "duty": "HD or LD",\n  "reasoning": "brief explanation"\n}';

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
