// services/skuGenerator.js
const PREFIX_MAP = {
  'Lube': 'EL8', 'Oil': 'EL8', 'Air': 'EA1', 'Air Housing': 'EA2',
  'Air Filter Housing': 'EA2', 'Fuel': 'EF9', 'Hydraulic': 'EH6',
  'Cabin': 'EC1', 'Cabin Air': 'EC1', 'Marine': 'EM9', 'Turbine': 'ET9',
  'Air Dryer': 'ED4', 'Fuel Separator': 'ES9', 'Coolant': 'EW7',
  'Kit HD': 'EK5', 'Kit LD': 'EK3'
};

const SPECS = {
  HD: {
    STANDARD: { microns: 40, technology: 'Celulosa / Mezcla (Blend)', description: 'Engineered for everyday operational demands', efficiency: '98.7%' },
    PERFORMANCE: { microns: 21, technology: 'Celulosa Estándar', description: 'Enhanced efficiency and dirt-holding capacity', efficiency: '99.5%' },
    ELITE: { microns: 15, technology: 'Synteq™ (Donaldson Blue®)', description: 'Maximum synthetic protection for extreme service', efficiency: '99.9%' }
  },
  LD: {
    STANDARD: { microns: 25, technology: 'Extra Guard', description: 'Engineered for everyday operational demands', efficiency: '95%' },
    PERFORMANCE: { microns: 15, technology: 'Tough Guard', description: 'Enhanced efficiency and dirt-holding capacity', efficiency: '97%' },
    ELITE: { microns: 10, technology: 'Ultra Synthetic / XG', description: 'Maximum synthetic protection for extreme service', efficiency: '99%' }
  }
};

function getPrefixByType(filterType) {
  return PREFIX_MAP[filterType.trim()] || 'EL8';
}

function extractLastFour(code) {
  const cleaned = code.replace(/[^A-Z0-9]/gi, '');
  return cleaned.slice(-4).toUpperCase();
}

function detectFRAMLevel(framCode, title = '') {
  const titleLower = title.toLowerCase();
  const codeLower = framCode.toLowerCase();
  if (titleLower.includes('ultra') || titleLower.includes('synthetic') || titleLower.includes('xg') || codeLower.startsWith('xg')) return 'ELITE';
  if (titleLower.includes('tough')) return 'PERFORMANCE';
  return 'STANDARD';
}

function detectDonaldsonLevel(donaldsonCode) {
  const codeUpper = donaldsonCode.toUpperCase();
  if (codeUpper.startsWith('DBL')) return 'ELITE';
  if (codeUpper.match(/00[05]$/)) return 'STANDARD';
  return 'PERFORMANCE';
}

function generateSKU(sourceCode, filterType, level, duty = 'HD') {
  const prefix = getPrefixByType(filterType);
  const lastFour = extractLastFour(sourceCode);
  const sku = prefix + lastFour;
  const specs = SPECS[duty][level];
  
  return {
    sku, level, sourceCode, filterType, duty,
    microns: specs.microns,
    technology: specs.technology,
    description: specs.description,
    efficiency: specs.efficiency,
    isDefault: level === 'PERFORMANCE'
  };
}

function generateFromDonaldson(donaldsonResults, filterType) {
  const skus = { STANDARD: null, PERFORMANCE: null, ELITE: null };
  donaldsonResults.forEach(result => {
    const level = detectDonaldsonLevel(result.code);
    const sku = generateSKU(result.code, filterType, level, 'HD');
    sku.specifications = result.specifications || {};
    sku.applications = result.applications || [];
    sku.crossReferences = result.crossReferences || [];
    skus[level] = sku;
  });
  return skus;
}

function generateFromFRAM(framResults, filterType) {
  const skus = { STANDARD: null, PERFORMANCE: null, ELITE: null };
  framResults.forEach(result => {
    const level = detectFRAMLevel(result.code, result.description);
    const sku = generateSKU(result.code, filterType, level, 'LD');
    sku.specifications = result.specifications || {};
    sku.applications = result.applications || [];
    sku.crossReferences = result.crossReferences || [];
    skus[level] = sku;
  });
  return skus;
}

async function generateELIMSKUs(originalCode, duty, filterType, scraperResults) {
  console.log(`🔧 Generando SKUs para ${originalCode} (${duty})`);
  let skus = duty === 'HD' ? generateFromDonaldson(scraperResults, filterType) : generateFromFRAM(scraperResults, filterType);
  return { standard: skus.STANDARD, performance: skus.PERFORMANCE, elite: skus.ELITE };
}

module.exports = { generateELIMSKUs, generateSKU, getPrefixByType, detectFRAMLevel, detectDonaldsonLevel, SPECS, PREFIX_MAP };
