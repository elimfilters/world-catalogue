const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const FILTER_CATEGORIES = {
  AIR: { prefix: 'EA1', pattern: /air|intake|cabin air|engine air/i, duties: ['HD', 'LD'] },
  FUEL: { prefix: 'EF9', pattern: /fuel|diesel|gasoline|petrol/i, duties: ['HD', 'LD'] },
  CABIN: { prefix: 'EC1', pattern: /cabin|hvac|interior/i, duties: ['HD', 'LD'] },
  HYDRAULIC: { prefix: 'EH6', pattern: /hydraulic|hyd|transmission oil/i, duties: ['HD'] },
  OIL: { prefix: 'EL8', pattern: /oil|lube|lubricant|engine oil/i, duties: ['HD', 'LD'] },
  COOLANT: { prefix: 'EW7', pattern: /coolant|water|radiator/i, duties: ['HD'] },
  MARINE: { prefix: 'EM9', pattern: /marine|marina|boat|naval/i, duties: ['HD', 'LD'] },
  TURBINE: { prefix: 'ET9', pattern: /turbine|turbina|turbo/i, duties: ['HD'] },
  AIR_DRYER: { prefix: 'ED4', pattern: /air dryer|dryer|brake air|compressed air/i, duties: ['HD'] },
  FUEL_SEPARATOR: { prefix: 'ES9', pattern: /fuel separator|water separator|fuel\\/water/i, duties: ['HD'] },
  KIT_HD: { prefix: 'EK5', pattern: /kit|maintenance kit|service kit|filter kit/i, duties: ['HD'] },
  KIT_LD: { prefix: 'EK3', pattern: /kit|maintenance kit|service kit|filter kit/i, duties: ['LD'] }
};

class ClassifierService {
  async classifyFilter(filterCode, context = {}) {
    try {
      console.log(\[Classifier] Processing: \\);

      // Quick pattern matching first
      const quickMatch = this.quickClassify(filterCode, context);
      if (quickMatch.confidence > 0.7) {
        console.log(\[Classifier] Quick match: \ (\)\);
        return quickMatch;
      }

      // Use GROQ for complex cases
      const groqResult = await this.groqClassify(filterCode, context);
      console.log(\[Classifier] GROQ result: \ (\)\);
      
      return groqResult;
    } catch (error) {
      console.error('[Classifier] Error:', error.message);
      return this.getFallbackClassification(filterCode);
    }
  }

  quickClassify(filterCode, context) {
    const searchText = \\ \ \\.toLowerCase();
    
    let bestMatch = { type: 'OIL', confidence: 0.3, duty: 'HD', prefix: 'EL8' };
    
    for (const [type, config] of Object.entries(FILTER_CATEGORIES)) {
      if (config.pattern.test(searchText)) {
        const confidence = this.calculateConfidence(searchText, config.pattern);
        if (confidence > bestMatch.confidence) {
          bestMatch = {
            type,
            confidence,
            duty: config.duties[0],
            prefix: config.prefix
          };
        }
      }
    }

    return bestMatch;
  }

  async groqClassify(filterCode, context) {
    const prompt = \Classify this filter code: \

Context: \

Categories:
- AIR (EA1): Air filters, intake filters
- FUEL (EF9): Fuel filters, diesel filters
- CABIN (EC1): Cabin air filters, HVAC filters
- HYDRAULIC (EH6): Hydraulic filters, transmission filters
- OIL (EL8): Oil filters, lube filters
- COOLANT (EW7): Coolant filters, water filters
- MARINE (EM9): Marine filters
- TURBINE (ET9): Turbine filters
- AIR_DRYER (ED4): Air dryer filters
- FUEL_SEPARATOR (ES9): Fuel/water separators
- KIT_HD (EK5): Heavy duty maintenance kits
- KIT_LD (EK3): Light duty maintenance kits

Respond with JSON only:
{
  "type": "category name",
  "confidence": 0.0-1.0,
  "duty": "HD or LD",
  "reasoning": "brief explanation"
}\;

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
      reasoning: 'Default classification'
    };
  }
}

module.exports = new ClassifierService();
