// ============================================================================
// DONALDSON SCRAPER – AUTORIDAD TÉCNICA HD
// Valida códigos Donaldson reales, cruces OEM y reglas estrictas de serie
// NO scrapea web
// NO infiere productos
// ============================================================================

const { extract4Digits } = require('../utils/digitExtractor');
const prefixMap = require('../config/prefixMap');
const { appendWatch } = require('../utils/pSeriesWatchlist');

// ============================================================================
// BASE DE DATOS CURADA (SOLO EJEMPLOS REPRESENTATIVOS)
// En producción se extiende vía ingestión controlada
// ============================================================================

const DONALDSON_DATABASE = {
  'P552100': {
    family: 'OIL',
    specifications: {
      media_type: 'Cellulose',
      style: 'Spin-On'
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

// ============================================================================
// SERIES DETECTION (ESTRICTO)
// ============================================================================

function detectSeriesType(code) {
  const c = code.toUpperCase();
  if (c.startsWith('DBL')) return 'DBL';
  if (c.startsWith('DBA')) return 'DBA';
  if (c.startsWith('ELF')) return 'ELF';
  if (c.startsWith('P')) return 'P';
  return null;
}

// ============================================================================
// FAMILY DETECTION (REGLAS DONALDSON)
// ============================================================================

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

// ============================================================================
// CROSS-REFERENCE RESOLUTION
// ============================================================================

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

// ============================================================================
// SCRAPER PRINCIPAL (SIN WEB)
// ============================================================================

async function scrapeDonaldson(code) {
  const normalized = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  // 1️⃣ Base curada
  const resolved = findDonaldsonCode(normalized);
  if (resolved && DONALDSON_DATABASE[resolved]) {
    const data = DONALDSON_DATABASE[resolved];
    return {
      found: true,
      code: resolved,
      family_hint: data.family,
      series: detectSeriesType(resolved),
      cross: Object.keys(data.cross_references || {}),
      attributes: data.specifications || {}
    };
  }

  // 2️⃣ Validación estricta por patrón Donaldson
  if (
    prefixMap.DONALDSON_STRICT_REGEX.test(normalized)
  ) {
    const family = detectFamilyFromCode(normalized);
    if (family) {
      return {
        found: true,
        code: normalized,
        family_hint: family,
        series: detectSeriesType(normalized),
        cross: [],
        attributes: {}
      };
    }
  }

  // 3️⃣ Registrar intento fallido
  if (normalized.startsWith('P')) {
    appendWatch(normalized, 'NOT_FOUND_DONALDSON');
  }

  return { found: false };
}

// ============================================================================
// VALIDATOR PARA SCRAPER BRIDGE
// ============================================================================

async function validateDonaldsonCode(inputCode) {
  const normalized = String(inputCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  const result = await scrapeDonaldson(normalized);

  if (!result || !result.found) {
    return { valid: false, code: normalized, reason: 'NOT_FOUND_DONALDSON' };
  }

  return {
    valid: true,
    code: result.code,
    source: 'DONALDSON',
    family: result.family_hint,
    duty: 'HD',
    last4: extract4Digits(result.code),
    cross: result.cross || [],
    attributes: {
      ...(result.attributes || {}),
      series: result.series
    }
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  scrapeDonaldson,
  validateDonaldsonCode,
  detectSeriesType,
  detectFamilyFromCode,
  findDonaldsonCode,
  DONALDSON_DATABASE
};
