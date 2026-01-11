const Groq = require('groq-sdk');
const FilterClassification = require('../models/FilterClassification');

class ClassifierService {
  constructor() {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    this.patterns = {
      // Donaldson
      donaldson: /^(P|DBL|X|FPG)\d{4,6}$/i,
      
      // OEM Heavy Duty
      caterpillar: /^[1-9][A-Z]\d{4}$/i,  // 1R1808, 2P4005, etc.
      johnDeere: /^(RE|AR|AT|AL|AH|DZ)\d{4,6}$/i,
      komatsu: /^(600[0-3]|6[0-9]{3})-\d{2}-\d{4}$/i,
      cummins: /^\d{7}$/,
      mack: /^\d{8}$/,
      
      // Tier 1 Aftermarket HD
      fleetguard: /^(FF|FS|LF|AF|WF|HF)\d{4,5}$/i,
      baldwin: /^(PA|BF|PT|BT)\d{4,5}$/i,
      
      // Light Duty OEM
      ford: /^[EF][A-Z0-9]{1,2}-\d{4,5}$/i,
      toyota: /^(90915|04152|17801)-[A-Z0-9]{5}$/i,
      honda: /^15400-[A-Z0-9]{3}-[A-Z0-9]{3}$/i,
      
      // Tier 2 Aftermarket LD
      fram: /^(PH|CA|G|C|CH|CS)\d{4,5}$/i,
      wix: /^\d{5}$/,
      purolator: /^[A-Z]\d{5}$/i
    };

    // Manufacturer database
    this.manufacturers = {
      // HD OEMs
      caterpillar: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL' },
      johnDeere: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'NORTH AMERICA' },
      komatsu: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL' },
      cummins: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL' },
      mack: { tier: 'OEM', duty: 'HEAVY DUTY (HD)', region: 'NORTH AMERICA' },
      
      // LD OEMs
      ford: { tier: 'OEM', duty: 'LIGHT DUTY (LD)', region: 'NORTH AMERICA' },
      toyota: { tier: 'OEM', duty: 'LIGHT DUTY (LD)', region: 'GLOBAL' },
      honda: { tier: 'OEM', duty: 'LIGHT DUTY (LD)', region: 'GLOBAL' },
      
      // Tier 1 Aftermarket
      donaldson: { tier: 'TIER 1 - AFTERMARKET', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL' },
      fleetguard: { tier: 'TIER 1 - AFTERMARKET', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL' },
      baldwin: { tier: 'TIER 1 - AFTERMARKET', duty: 'HEAVY DUTY (HD)', region: 'GLOBAL' },
      
      // Tier 2 Aftermarket
      fram: { tier: 'TIER 2 - AFTERMARKET', duty: 'LIGHT DUTY (LD)', region: 'NORTH AMERICA' },
      wix: { tier: 'TIER 2 - AFTERMARKET', duty: 'MIXED', region: 'GLOBAL' },
      purolator: { tier: 'TIER 2 - AFTERMARKET', duty: 'LIGHT DUTY (LD)', region: 'NORTH AMERICA' }
    };
  }

  async classifyFilter(filterCode) {
    try {
      // 1. Check cache first
      const cached = await FilterClassification.findOne({ filterCode });
      if (cached) {
        console.log(`✅ Cache hit for ${filterCode}`);
        return {
          manufacturer: cached.manufacturer,
          tier: cached.tier,
          duty: cached.duty,
          region: cached.region,
          confidence: cached.confidence,
          method: cached.method,
          cached: true
        };
      }

      // 2. Try pattern matching
      console.log(`🔍 Pattern matching for ${filterCode}`);
      let classification = this.patternMatch(filterCode);

      // 3. If pattern match failed, use GROQ
      if (classification.manufacturer === 'UNKNOWN') {
        console.log(`🤖 Using GROQ for ${filterCode}`);
        classification = await this.classifyWithGroq(filterCode);
      }

      // 4. Save to cache (only if confidence is not LOW)
      if (classification.confidence !== 'LOW') {
        await FilterClassification.create({
          filterCode,
          ...classification
        });
        console.log(`💾 Cached classification for ${filterCode}`);
      }

      return { ...classification, cached: false };
    } catch (error) {
      console.error('❌ Classification error:', error);
      throw error;
    }
  }

  patternMatch(filterCode) {
    for (const [manufacturer, pattern] of Object.entries(this.patterns)) {
      if (pattern.test(filterCode)) {
        const info = this.manufacturers[manufacturer];
        return {
          manufacturer: this.formatManufacturerName(manufacturer),
          tier: info.tier,
          duty: info.duty,
          region: info.region,
          confidence: 'HIGH',
          method: 'PATTERN_MATCH'
        };
      }
    }

    return {
      manufacturer: 'UNKNOWN',
      tier: 'UNKNOWN',
      duty: 'UNKNOWN',
      region: 'UNKNOWN',
      confidence: 'LOW',
      method: 'NO_MATCH'
    };
  }

  async classifyWithGroq(filterCode) {
    try {
      const prompt = `You are a filter classification expert. Analyze this filter code: "${filterCode}"
      
Identify:
1. Manufacturer (Caterpillar, John Deere, Donaldson, FRAM, Baldwin, Fleetguard, Komatsu, Cummins, Ford, Toyota, WIX, etc.)
2. Tier (OEM, TIER 1 - AFTERMARKET, TIER 2 - AFTERMARKET, TIER 3 - AFTERMARKET)
3. Duty (HEAVY DUTY (HD) or LIGHT DUTY (LD))
4. Region (NORTH AMERICA, EUROPE, ASIA, GLOBAL)
5. Confidence (HIGH, MEDIUM, LOW)

Heavy Duty manufacturers: Caterpillar, John Deere, Komatsu, Donaldson, Fleetguard, Baldwin, Cummins, Mack, Volvo, Detroit Diesel
Light Duty manufacturers: Ford, Toyota, Honda, BMW, Mercedes, FRAM, Purolator

Respond ONLY with valid JSON:
{
  "manufacturer": "Manufacturer Name",
  "tier": "OEM or TIER X - AFTERMARKET",
  "duty": "HEAVY DUTY (HD) or LIGHT DUTY (LD)",
  "region": "Region",
  "confidence": "HIGH/MEDIUM/LOW"
}`;

      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        max_tokens: 200
      });

      const response = completion.choices[0]?.message?.content;
      
      if (!response) {
        throw new Error('No response from GROQ');
      }

      // Parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid JSON response from GROQ');
      }

      const result = JSON.parse(jsonMatch[0]);

      return {
        manufacturer: result.manufacturer,
        tier: result.tier,
        duty: result.duty,
        region: result.region,
        confidence: result.confidence,
        method: 'GROQ_AI'
      };

    } catch (error) {
      console.error('❌ GROQ classification failed:', error.message);
      return {
        manufacturer: 'UNKNOWN',
        tier: 'UNKNOWN',
        duty: 'UNKNOWN',
        region: 'UNKNOWN',
        confidence: 'LOW',
        method: 'GROQ_ERROR'
      };
    }
  }

  formatManufacturerName(key) {
    const names = {
      donaldson: 'Donaldson',
      caterpillar: 'Caterpillar',
      johnDeere: 'John Deere',
      komatsu: 'Komatsu',
      cummins: 'Cummins',
      mack: 'Mack',
      fleetguard: 'Fleetguard',
      baldwin: 'Baldwin',
      ford: 'Ford',
      toyota: 'Toyota',
      honda: 'Honda',
      fram: 'FRAM',
      wix: 'WIX',
      purolator: 'Purolator'
    };
    return names[key] || key;
  }
}

module.exports = new ClassifierService();
