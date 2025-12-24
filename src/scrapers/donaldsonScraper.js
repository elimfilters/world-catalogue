// ============================================================================
// DONALDSON SCRAPER – AUTORIDAD TÉCNICA HD
// Valida códigos Donaldson reales, cruces OEM y reglas estrictas de serie
// ============================================================================

const { extract4Digits } = require('../utils/digitExtractor');
const prefixMap = require('../config/prefixMap');
const { appendWatch } = require('../utils/pSeriesWatchlist');

const DONALDSON_DATABASE = {
  'P552100': {
    family: 'OIL',
    specifications: {
      media_type: 'Cellulose',
      style: 'Spin-On',
      height_mm: '136',
      outer_diameter_mm: '93',
      thread_size: '3/4-16 UNF'
    },
    cross_references: {
      'FLEETGUARD-LF3620': 'P552100',
      'BALDWIN-B495': 'P552100',
      'FRAM-PH7405': 'P552100',
      'CATERPILLAR-3I1882': 'P552100'
    }
  },

  'P527682': {
    family: 'AIR',
    specifications: {
      style: 'Radialseal'
    },
    cross_references: {
      'AF25139': 'P527682',
      'WIX-46556': 'P527682'
    }
  },

  'P551808': {
    family: 'OIL',
    specifications: {},
    cross_references: {
      '1R-1808': 'P551808',
      'CATERPILLAR-1R1808': 'P551808'
    }
  }
};

function detectSeriesType(code) {
  const c = code.toUpperCase();
  if (c.startsWith('DBL')) return 'DBL';
  if (c.startsWith('DBA')) return 'DBA';
  if (c.startsWith('ELF')) return 'ELF';
  if (c.startsWith('P')) return 'P';
  return null;
}

function detectFamilyFromCode(code) {
  const c = code.toUpperCase();
  const series = detectSeriesType(c);

  if (series === 'DBL' || series === 'ELF') return 'OIL';
  if (series === 'DBA') return 'AIR';

  if (series === 'P') {
    if (/^P55\d{4}$/.test(c)) return 'OIL';
    if (/^P56\d{4}$/.test(c)) return 'FUEL';
    if (/^P62\d{4}$/.test(c)) return 'AIR';
    if (/^P95\d{4}$/.test(c)) return 'AIR DRYER';
    if (/^P60\d{4}$/.test(c)) return 'COOLANT';
    return null;
  }

  return null;
}

function findDonaldsonCode(inputCode) {
  const normalized = inputCode.toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (DONALDSON_DATABASE[normalized]) return normalized;

  for (const [donCode, data] of Object.entries(DONALDSON_DATABASE)) {
    for (const xref of Object.keys(data.cross_references || {})) {
      const x = xref.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (x === normalized || x.includes(normalized) || normalized.includes(x)) {
        return donCode;
      }
    }
  }

  return null;
}

async function scrapeDonaldson(code) {
  const normalized = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  const resolved = findDonaldsonCode(normalized);
  if (resolved && DONALDSON_DATABASE[resolved]) {
    const data = DONALDSON_DATABASE[resolved];
    
    const crossRefs = Object.keys(data.cross_references || {}).map(xref => ({
      brand: xref.split('-')[0],
      code: xref.split('-')[1] || xref,
      type: 'CROSS'
    }));

    return {
      confirmed: true,
      source: 'DONALDSON',
      facts: {
        code: resolved,
        family: data.family,
        duty: 'HD',
        attributes: data.specifications || {},
        cross: crossRefs,
        applications: []
      }
    };
  }

  if (prefixMap.DONALDSON_STRICT_REGEX && prefixMap.DONALDSON_STRICT_REGEX.test(normalized)) {
    const family = detectFamilyFromCode(normalized);
    if (family) {
      return {
        confirmed: true,
        source: 'DONALDSON',
        facts: {
          code: normalized,
          family: family,
          duty: 'HD',
          attributes: {
            series: detectSeriesType(normalized)
          },
          cross: [],
          applications: []
        }
      };
    }
  }

  if (normalized.startsWith('P')) {
    if (typeof appendWatch === 'function') {
      appendWatch(normalized, 'NOT_FOUND_DONALDSON');
    }
  }

  return { confirmed: false };
}

async function validateDonaldsonCode(inputCode) {
  const normalized = String(inputCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const result = await scrapeDonaldson(normalized);

  if (!result || !result.confirmed) {
    return { valid: false, code: normalized, reason: 'NOT_FOUND_DONALDSON' };
  }

  return {
    valid: true,
    code: result.facts.code,
    source: 'DONALDSON',
    family: result.facts.family,
    duty: result.facts.duty,
    last4: extract4Digits(result.facts.code),
    cross: result.facts.cross || [],
    attributes: result.facts.attributes || {}
  };
}

module.exports = {
  scrapeDonaldson,
  validateDonaldsonCode,
  detectSeriesType,
  detectFamilyFromCode,
  findDonaldsonCode,
  DONALDSON_DATABASE
};
