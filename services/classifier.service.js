const Groq = require('groq-sdk');
const { buildImprovedPrompt } = require('./improved_groq_prompt');
const { isMarineManufacturer, generateMarineSKU } = require('../src/utils/marineDetector');
const kitService = require('./kitService');
const donaldsonKitScraper = require('./donaldsonKitScraper');
const framKitScraper = require('./framKitScraper');

class ClassifierService {
  constructor() {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  detectManufacturer(filterCode) {
    const code = filterCode.trim().toUpperCase();

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

  async processFilter(filterCode) {
    try {
      console.log('[Classifier] Processing:', filterCode);

      const detectedManufacturer = this.detectManufacturer(filterCode);
      console.log('[Classifier] Initial detection:', detectedManufacturer.name);

      const prompt = buildImprovedPrompt(filterCode, detectedManufacturer);

      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        max_tokens: 500
      });

      const content = completion.choices[0]?.message?.content || '{}';
      console.log('[GROQ] Response received');

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const result = JSON.parse(jsonMatch[0]);

      if (isMarineManufacturer(result.manufacturer)) {
        console.log('[Marine] Detected:', result.manufacturer);
        const marineSKU = generateMarineSKU(filterCode);
        return {
          manufacturer: result.manufacturer,
          filterType: result.filterType || 'Marine',
          duty: 'Marine',
          elimfiltersPrefix: 'EM9',
          elimfiltersSKU: marineSKU,
          confidence: 'high',
          detectedManufacturer: result.detectedManufacturer || detectedManufacturer,
          source: 'marine_classification'
        };
      }

      if (!['HD', 'LD'].includes(result.duty)) {
        console.log('[Warning] Invalid duty:', result.duty);
        throw new Error('Invalid duty: ' + result.duty);
      }

      console.log('[Classifier] Classified as:', result.duty);

      const finalResult = {
        ...result,
        detectedManufacturer,
        confidence: result.confidence || 'high'
      };

      return finalResult;

    } catch (error) {
      console.error('[Error] Classifier:', error.message);
      throw error;
    }
  }

  async findKitForFilter(filterCode, duty, elimfiltersSKU) {
    try {
      if (duty === 'HD' && elimfiltersSKU) {
        const donaldsonCode = elimfiltersSKU.replace('EL8', 'P55').replace('EF9', 'P55').replace('EA1', 'P');
        const kit = await kitService.findKitByFilter(donaldsonCode, 'HD');
        
        if (kit) {
          console.log('[Kit] Found HD kit for filter:', kit.kit_sku);
          return kit;
        }
      }

      if (duty === 'LD' && elimfiltersSKU) {
        const framCode = elimfiltersSKU.replace('EL8', 'PH').replace('EF9', 'FT').replace('EA1', 'CA');
        const kit = await kitService.findKitByFilter(framCode, 'LD');
        
        if (kit) {
          console.log('[Kit] Found LD kit for filter:', kit.kit_sku);
          return kit;
        }
      }

      return null;
    } catch (error) {
      console.error('[Kit] Error finding kit:', error.message);
      return null;
    }
  }
}

module.exports = new ClassifierService();
