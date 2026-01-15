const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const donaldsonScraper = require('./scrapers/donaldson.crossref.scraper');
const framScraper = require('./scrapers/fram.crossref.scraper');

// Listas de fabricantes
const HD_MANUFACTURERS = [
  'CATERPILLAR', 'CAT', 'JOHN DEERE', 'DEERE', 'KOMATSU', 'BOBCAT',
  'CASE', 'NEW HOLLAND', 'AGCO', 'MACK', 'FREIGHTLINER', 'VOLVO',
  'PERKINS', 'CUMMINS', 'DEUTZ', 'ATLAS COPCO', 'BANDIT', 'CLAAS',
  'PETERBILT', 'KENWORTH', 'INTERNATIONAL', 'TEREX', 'JCB', 'HITACHI',
  'LIEBHERR', 'DOOSAN', 'HYUNDAI HEAVY', 'KOBELCO', 'SUMITOMO'
];

const LD_MANUFACTURERS = [
  'FORD', 'TOYOTA', 'BMW', 'MERCEDES', 'BENZ', 'HONDA', 'NISSAN',
  'CHEVROLET', 'CHEVY', 'DODGE', 'VOLKSWAGEN', 'VW', 'HYUNDAI', 'KIA',
  'MAZDA', 'SUBARU', 'AUDI', 'LEXUS', 'ACURA', 'INFINITI', 'JEEP',
  'RAM', 'GMC', 'BUICK', 'CADILLAC', 'CHRYSLER', 'MITSUBISHI', 'SUZUKI'
];

function extractManufacturerFromText(text) {
  if (!text) return null;
  
  const textUpper = text.toUpperCase();
  
  for (const mfg of HD_MANUFACTURERS) {
    if (textUpper.includes(mfg)) {
      return { name: mfg, duty: 'HD' };
    }
  }
  
  for (const mfg of LD_MANUFACTURERS) {
    if (textUpper.includes(mfg)) {
      return { name: mfg, duty: 'LD' };
    }
  }
  
  return null;
}

async function getApplicationsFromScraper(code) {
  try {
    console.log('[DUTY] Attempting Donaldson scraper for applications...');
    const donaldsonResult = await donaldsonScraper(code);
    
    if (donaldsonResult && donaldsonResult.applications) {
      return { source: 'donaldson', applications: donaldsonResult.applications };
    }
  } catch (error) {
    console.log('[DUTY] Donaldson scraper failed:', error.message);
  }

  try {
    console.log('[DUTY] Attempting FRAM scraper for applications...');
    const framResult = await framScraper(code);
    
    if (framResult && framResult.applications) {
      return { source: 'fram', applications: framResult.applications };
    }
  } catch (error) {
    console.log('[DUTY] FRAM scraper failed:', error.message);
  }

  return null;
}

async function detectDuty(code, specifications = {}) {
  try {
    console.log('[DUTY] Starting detection for:', code);

    const applicationsData = await getApplicationsFromScraper(code);
    
    if (applicationsData && applicationsData.applications) {
      const appText = JSON.stringify(applicationsData.applications);
      const manufacturer = extractManufacturerFromText(appText);
      
      if (manufacturer) {
        console.log('[DUTY] Detected from applications:', manufacturer.name, '→', manufacturer.duty);
        return {
          duty: manufacturer.duty,
          confidence: 'high',
          method: 'application_scraping',
          manufacturer: manufacturer.name,
          source: applicationsData.source
        };
      }
    }

    const specsText = JSON.stringify(specifications).toUpperCase();
    const specsManufacturer = extractManufacturerFromText(specsText);
    
    if (specsManufacturer) {
      console.log('[DUTY] Detected from specifications:', specsManufacturer.name, '→', specsManufacturer.duty);
      return {
        duty: specsManufacturer.duty,
        confidence: 'medium',
        method: 'specifications',
        manufacturer: specsManufacturer.name
      };
    }

    console.log('[DUTY] Using AI for determination...');
    const prompt = 'Analiza este codigo de filtro y determina si es Heavy Duty (HD) o Light Duty (LD).\n\nCodigo: ' + code + '\nEspecificaciones: ' + JSON.stringify(specifications) + '\n\nHD = Equipos industriales, maquinaria pesada, camiones (Caterpillar, John Deere, Komatsu, Mack, etc.)\nLD = Vehiculos automotrices ligeros (Ford, Toyota, BMW, Honda, etc.)\n\nResponde SOLO con JSON:\n{"duty":"HD","confidence":"low","reason":"breve explicacion"}';

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0
    });

    let response = completion.choices[0].message.content;
    response = response.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    const aiResult = JSON.parse(response);

    console.log('[DUTY] AI determination:', aiResult.duty);
    return {
      duty: aiResult.duty,
      confidence: 'low',
      method: 'ai',
      reason: aiResult.reason
    };

  } catch (error) {
    console.error('[DUTY] Error in detection:', error.message);
    return { 
      duty: 'HD', 
      confidence: 'default', 
      method: 'fallback',
      reason: 'Error in detection, defaulting to HD'
    };
  }
}

module.exports = { detectDuty };
