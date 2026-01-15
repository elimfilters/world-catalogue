const Groq = require('groq-sdk');
const { buildImprovedPrompt } = require('./improved_groq_prompt');
const { isMarineManufacturer, generateMarineSKU } = require('../src/utils/marineDetector');
const { isHousingCode, generateEA2SKU } = require('../src/utils/housingDetector');
const { performCrossReference } = require('./crossReference.service');

class ClassifierService {
  constructor() {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    
    // 🎯 TABLA DE PREFIJOS ELIMFILTERS
    this.prefixMap = {
      'AIR': 'EA1',
      'FUEL': 'EF9',
      'CABIN': 'EC1',
      'HYDRAULIC': 'EH6',
      'OIL': 'EL8',
      'LUBE': 'EL8',
      'COOLANT': 'EW7',
      'MARINE': 'EM9',
      'TURBINE': 'ET9',
      'AIR_DRYER': 'ED4'
    };
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

  // 🎯 NUEVA FUNCIÓN: Generar SKU desde código cross-reference
  generateElimfiltersSKU(crossRefCode, filterType) {
    if (!crossRefCode) return '';
    
    // Extraer últimos 4 dígitos del código (ej: P551808 → 1808)
    const digitsOnly = crossRefCode.replace(/\D/g, '');
    const last4 = digitsOnly.slice(-4);
    
    if (!last4 || last4.length < 4) return '';
    
    // Obtener prefix según tipo de filtro
    const prefix = this.prefixMap[filterType.toUpperCase()] || '';
    
    if (!prefix) {
      console.log('[SKU] Unknown filter type:', filterType);
      return '';
    }
    
    const sku = `${prefix}${last4}`;
    console.log('[SKU] Generated:', sku, 'from', crossRefCode);
    return sku;
  }

  async processFilter(filterCode) {
    try {
      console.log('[Classifier] Processing:', filterCode);

      if (isHousingCode(filterCode)) {
        console.log('[Housing] Detected EA2 housing:', filterCode);
        const ea2SKU = generateEA2SKU(filterCode);

        return {
          manufacturer: 'Donaldson',
          filterType: 'HOUSING',
          duty: 'HD',
          elimfiltersPrefix: 'EA2',
          elimfiltersSKU: ea2SKU,
          confidence: 'high',
          detectedManufacturer: { name: 'Donaldson', tier: 'Tier 1', aliases: ['Donaldson'], confidence: 'high' },
          source: 'housing_detection',
          ea2Flag: true,
          primaryAirFilters: [],
          secondaryAirFilters: []
        };
      }

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

      // 🎯 HACER CROSS-REFERENCE
      const crossRef = await performCrossReference(
        filterCode,
        result.filterType || 'OIL',
        result.duty
      );

      // 🎯 GENERAR SKU desde el código cross-reference obtenido
      const elimfiltersSKU = this.generateElimfiltersSKU(
        crossRef.crossReferenceCode, 
        result.filterType
      );
      
      const elimfiltersPrefix = elimfiltersSKU ? elimfiltersSKU.match(/^([A-Z]+\d)/)?.[1] || '' : '';

      return {
        ...result,
        detectedManufacturer,
        confidence: result.confidence || 'high',
        crossReferenceCode: crossRef.crossReferenceCode,
        elimfiltersSKU: elimfiltersSKU,
        elimfiltersPrefix: elimfiltersPrefix,
        elimfiltersSeries: crossRef.elimfiltersSeries || 'STANDARD',
        alternativeSKUs: crossRef.alternativeSKUs || [],
        crossReferences: crossRef.crossReferences
      };

    } catch (error) {
      console.error('[Error] Classifier:', error.message);
      throw error;
    }
  }
}

module.exports = new ClassifierService();
