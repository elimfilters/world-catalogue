const Groq = require('groq-sdk');
const housingDetector = require('../utils/housingDetector');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

class ClassifierService {
  async processFilter(filterCode) {
    console.log(`[Classifier] Processing: ${filterCode}`);
    
    // 1. DETECTAR CARCASAS PRIMERO (EA2)
    const housingResult = housingDetector.detectHousing(filterCode);
    if (housingResult.isHousing) {
      console.log(`[Classifier] Housing detected: ${filterCode}`);
      return {
        manufacturer: housingResult.manufacturer,
        filterType: 'AIR',
        duty: housingResult.duty,
        elimfiltersPrefix: 'EA2',
        elimfiltersSKU: `EA2${filterCode.replace(/[^0-9]/g, '').slice(-4)}`,
        confidence: housingResult.confidence,
        detectedManufacturer: {
          name: housingResult.manufacturer,
          tier: housingResult.tier,
          aliases: [],
          confidence: housingResult.confidence
        },
        crossReferenceCode: filterCode,
        elimfiltersSeries: 'HOUSING',
        alternativeSKUs: [],
        crossReferences: {}
      };
    }

    // 2. CONTINUAR CON CLASIFICACIÓN NORMAL
    const initialDetection = this.detectInitialType(filterCode);
    console.log(`[Classifier] Initial detection: ${initialDetection}`);
    
    // ... resto del código existente
