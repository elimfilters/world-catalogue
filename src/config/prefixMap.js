/**
 * ================================================================
 * WARNING — IMMUTABLE CONTRACT
 * ------------------------------------------------
 * This file does NOT generate ELIMFILTERS prefixes.
 *
 * Prefix generation is 100% controlled ONLY by:
 *   /src/config/prefixes.js        (immutable)
 *   /src/sku/generator.js          (immutable)
 *
 * Any attempt to derive EA1 / EL8 / EF9 / EC1 / EK3 / EK5 / EM9 / ET9
 * from brand detection MUST be blocked permanently.
 *
 * This module ONLY detects OEM brand/family/duty and NOTHING ELSE.
 * ================================================================
 */

function normalize(code) {
  return String(code || '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[-_]/g, '');
}

function getPrefix(code) {
  const c = normalize(code);
  if (c.startsWith('BOSCH')) return 'BOSCH';

  const mLetters = c.match(/^([A-Z]{1,4})/);
  if (mLetters) return mLetters[1];

  const mDigits = c.match(/^(\d{2,3})/);
  if (mDigits) return mDigits[1];

  return null;
}

// ---------------------------
// OEM BRAND DETECTION TABLES
// ---------------------------

const BRAND_BY_PREFIX = {
  CA: 'FRAM', CF: 'FRAM', CH: 'FRAM', PH: 'FRAM', TG: 'FRAM', XG: 'FRAM', HM: 'FRAM', G: 'FRAM',
  XC: 'ECOGARD', XA: 'ECOGARD',
  PG: 'PREMIUM GUARD',

  P: 'DONALDSON', DBL: 'DONALDSON', DBA: 'DONALDSON', ELF: 'DONALDSON',
  HFA: 'DONALDSON', HFP: 'DONALDSON', EAF: 'DONALDSON', X: 'DONALDSON',

  LF: 'FLEETGUARD', FF: 'FLEETGUARD', HF: 'FLEETGUARD', AF: 'FLEETGUARD',

  B: 'BALDWIN', BF: 'BALDWIN',

  WK: 'MANN', C: 'MANN', HU: 'MANN', CU: 'MANN', CUK: 'MANN',

  51: 'WIX', 33: 'WIX', 46: 'WIX',

  L: 'LUBERFINER', LFP: 'LUBERFINER',
  S: 'SAKURA',

  OC: 'MAHLE', LX: 'MAHLE', LA: 'MAHLE', KC: 'MAHLE', KL: 'MAHLE', OX: 'MAHLE',

  E: 'HENGST', H: 'HENGST',

  Z: 'RYCO', A: 'RYCO', R: 'RYCO',

  OP: 'FILTRON', AP: 'FILTRON', PP: 'FILTRON', K: 'FILTRON',

  PL: 'PUROLATOR',
  PS: 'K&N',
  PF: 'ACDELCO',

  BOSCH: 'BOSCH',
  UFI: 'UFI',
  HA: 'HASTINGS',
  RO: 'ROKI', TR: 'TOKYOROKI'
};

// ---------------------------
// OEM FAMILY DETECTION
// ---------------------------

const FAMILY_BY_PREFIX = {
  CA: 'AIRE', CF: 'CABIN', CH: 'CABIN', PH: 'OIL', TG: 'OIL', XG: 'OIL', HM: 'OIL', G: 'FUEL',
  XC: 'CABIN', XA: 'AIRE',
  PG: 'OIL',
  P: null, DBL: 'OIL', DBA: 'AIRE', ELF: 'OIL', HFA: 'AIRE', HFP: 'FUEL', EAF: 'AIRE',
  LF: 'OIL', FF: 'FUEL', HF: 'HYDRAULIC',
  AF: 'AIRE',
  BF: 'FUEL',
  WK: 'FUEL', C: 'AIRE', HU: 'OIL', CU: 'CABIN', CUK: 'CABIN',
  51: 'OIL', 33: 'AIRE', 46: 'FUEL',
  L: 'OIL', S: 'OIL', LFP: 'OIL',
  OC: 'OIL', LX: 'AIRE', LA: 'CABIN', KC: 'FUEL', KL: 'FUEL', OX: 'OIL',
  E: 'AIRE', H: 'OIL',
  Z: 'OIL', A: 'AIRE', R: 'FUEL',
  OP: 'OIL', AP: 'AIRE', PP: 'FUEL', K: 'CABIN',
  PL: 'OIL',
  HP: 'OIL',
  PF: 'OIL'
};

// ---------------------------
// OEM DUTY BY BRAND
// ---------------------------

const DUTY_BY_BRAND = {
  FRAM: 'LD',
  ECOGARD: 'LD',
  BOSCH: 'LD',
  'PREMIUM GUARD': 'LD',

  DONALDSON: 'HD',
  FLEETGUARD: 'HD',
  BALDWIN: 'HD',
  MANN: 'HD',
  WIX: 'HD',
  LUBERFINER: 'HD',
  SAKURA: 'HD',
  MAHLE: 'HD',
  HENGST: 'HD',
  RYCO: 'HD',
  FILTRON: 'HD',
  PUROLATOR: 'HD',
  'K&N': 'HD',
  ACDELCO: 'HD',
  UFI: 'HD',
  HASTINGS: 'HD',
  ROKI: 'HD',
  TOKYOROKI: 'HD',
  PARKER: 'HD'
};

// ---------------------------
// FRAM-LIKE DETECTION
// ---------------------------

const FRAM_PATTERNS = [
  /^PH\d{3,5}[A-Z]?$/,
  /^TG\d{3,5}[A-Z]?$/,
  /^XG\d{3,5}[A-Z]?$/,
  /^HM\d{3,5}[A-Z]?$/,
  /^CA\d{3,5}[A-Z]?$/,
  /^CF\d{3,5}[A-Z]?$/,
  /^CH\d{3,5}[A-Z]?$/,
  /^G\d{3,5}[A-Z]?$/,
  /^PS\d{3,5}[A-Z]?$/
];

function isFramLike(code) {
  if (String(code || '').includes('-')) return false;
  const c = normalize(code);
  return FRAM_PATTERNS.some(rx => rx.test(c));
}

// ---------------------------
// COLLISION RESOLUTION
// ---------------------------

const COLLISIONS = {
  PS: { useFramLike: true, preferBrand: 'FRAM', preferFamily: 'FUEL', preferDuty: 'LD' },

  L: { pattern: /^L\d{3,5}[A-Z]?$/, preferBrand: 'PUROLATOR', preferDuty: 'HD', preferFamily: 'OIL' },

  PF: { pattern: /^PF\d{3,5}[A-Z]?$/, preferBrand: 'ACDELCO', preferDuty: 'HD', preferFamily: 'OIL' },

  OP: { pattern: /^OP\d{3,5}[A-Z]?$/, preferBrand: 'FILTRON', preferDuty: 'HD', preferFamily: 'OIL' },

  HP: {
    rules: [
      { pattern: /^HP\d{3,5}$/, preferBrand: 'K&N', preferDuty: 'HD', preferFamily: 'OIL' },
      { pattern: /^HP\d{1,2}$/, preferBrand: 'FRAM', preferDuty: 'LD', preferFamily: 'OIL' }
    ]
  },

  S: {
    rules: [
      { pattern: /^S\d{5}$/, preferBrand: 'ECOGARD', preferDuty: 'LD', preferFamily: 'OIL' }
    ]
  },

  R: {
    rules: [
      { pattern: /^R90T$/, preferBrand: 'PARKER', preferDuty: 'HD', preferFamily: 'FUEL' },
      { pattern: /^R(12|15|20|25|45|60|120)(T|S)$/, preferBrand: 'PARKER', preferDuty: 'HD', preferFamily: 'FUEL' }
    ]
  }
};

// ---------------------------
// STRICT REGEX VALIDATION
// ---------------------------

const DONALDSON_STRICT_REGEX = new RegExp(
  '^(P5(0|2|3|4|5)\\d{4}[A-Z]?)$' +
  '|^(DBL|DBA|ELF)\\d{4,5}$' +
  '|^HFA\\d{4,5}$' +
  '|^HFP\\d{5}$' +
  '|^EAF\\d{5}$' +
  '|^P82\\d{4}[A-Z]?$' +
  '|^X\\d{5,6}$' +
  '|^C\\d{6}$'
);

const FRAM_STRICT_REGEX = new RegExp(
  '^PH\\d{3,5}[A-Z]?$' +
    '|^TG\\d{3,5}[A-Z]?$' +
    '|^XG\\d{3,5}[A-Z]?$' +
    '|^HM\\d{3,5}[A-Z]?$' +
    '|^CA\\d{3,5}[A-Z]?$' +
    '|^CF\\d{3,5}[A-Z]?$' +
    '|^CH\\d{3,5}[A-Z]?$' +
    '|^G\\d{3,5}[A-Z]?$' +
    '|^PS\\d{3,5}[A-Z]?$'
);

// ---------------------------
// MASTER RESOLUTION FUNCTION
// ---------------------------

function resolveBrandFamilyDutyByPrefix(code) {
  const p = getPrefix(code);
  if (!p) return null;

  let brand = BRAND_BY_PREFIX[p] || null;
  let family = FAMILY_BY_PREFIX[p] || null;
  let duty = brand ? DUTY_BY_BRAND[brand] || null : null;

  const colRule = COLLISIONS[p];
  if (colRule) {
    const c = normalize(code);

    if (Array.isArray(colRule.rules)) {
      for (const r of colRule.rules) {
        if (r.pattern && r.pattern.test(c)) {
          brand = r.preferBrand;
          family = r.preferFamily ?? family;
          duty = r.preferDuty ?? duty;
        }
      }
    } else {
      let apply = false;
      if (colRule.useFramLike && isFramLike(code)) apply = true;
      if (colRule.pattern && colRule.pattern.test(c)) apply = true;

      if (apply) {
        brand = colRule.preferBrand;
        family = colRule.preferFamily ?? family;
        duty = colRule.preferDuty ?? duty;
      }
    }
  }

  return { brand, family, duty, prefix: p };
}

// ---------------------------
// EXPORTS
// ---------------------------

module.exports = {
  normalize,
  getPrefix,
  BRAND_BY_PREFIX,
  FAMILY_BY_PREFIX,
  DUTY_BY_BRAND,
  resolveBrandFamilyDutyByPrefix,
  isFramLike,
  COLLISIONS,
  DONALDSON_STRICT_REGEX,
  FRAM_STRICT_REGEX
};