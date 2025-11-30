// Centralized prefix-based brand/family/duty detection

function normalize(code) {
  return String(code || '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[-_]/g, '');
}

function getPrefix(code) {
  const c = normalize(code);
  // Special-case brand tokens longer than 4 letters
  if (c.startsWith('BOSCH')) return 'BOSCH';
  // Letter-based prefixes first
  const mLetters = c.match(/^([A-Z]{1,4})/);
  if (mLetters) return mLetters[1];
  // Numeric prefixes (e.g., WIX 51xxx)
  const mDigits = c.match(/^(\d{2,3})/);
  if (mDigits) return mDigits[1];
  return null;
}

// Brand by prefix
const BRAND_BY_PREFIX = {
  // FRAM LD series
  CA: 'FRAM', CF: 'FRAM', CH: 'FRAM', PH: 'FRAM', TG: 'FRAM', XG: 'FRAM', HM: 'FRAM', G: 'FRAM',
  // ECOGARD LD series (partial)
  XC: 'ECOGARD',
  XA: 'ECOGARD',
  // PREMIUM GUARD aftermarket
  PG: 'PREMIUM GUARD',
  // Donaldson HD series
  P: 'DONALDSON', DBL: 'DONALDSON', DBA: 'DONALDSON', ELF: 'DONALDSON', HFA: 'DONALDSON', HFP: 'DONALDSON', EAF: 'DONALDSON', X: 'DONALDSON',
  // Other common HD brands
  LF: 'FLEETGUARD', FF: 'FLEETGUARD', HF: 'FLEETGUARD',
  AF: 'FLEETGUARD',
  B: 'BALDWIN',
  BF: 'BALDWIN',
  // MANN-FILTER
  WK: 'MANN', C: 'MANN', HU: 'MANN', CU: 'MANN', CUK: 'MANN',
  // WIX numeric families often start with 51/33/46
  51: 'WIX', 33: 'WIX', 46: 'WIX',
  // Sakura, Luberfiner (examples)
  L: 'LUBERFINER', LFP: 'LUBERFINER',
  S: 'SAKURA',
  // MAHLE
  OC: 'MAHLE', LX: 'MAHLE', LA: 'MAHLE', KC: 'MAHLE', KL: 'MAHLE', OX: 'MAHLE',
  // HENGST
  E: 'HENGST', H: 'HENGST',
  // RYCO
  Z: 'RYCO', A: 'RYCO', R: 'RYCO',
  // FILTRON
  OP: 'FILTRON', AP: 'FILTRON', PP: 'FILTRON', K: 'FILTRON',
  // PUROLATOR
  PL: 'PUROLATOR',
  // K&N / FRAM Racing handled via COLLISIONS (no default brand mapping here)
  PS: 'K&N',
  // ACDELCO
  PF: 'ACDELCO',
  // BOSCH aftermarket (recognized via special-case in getPrefix)
  BOSCH: 'BOSCH',
  // UFI
  UFI: 'UFI',
  // HASTINGS (generic marker)
  HA: 'HASTINGS',
  // ROKI / TOKYO ROKI
  RO: 'ROKI', TR: 'TOKYOROKI'
};

// Family by prefix (coarse hints)
const FAMILY_BY_PREFIX = {
  CA: 'AIRE', CF: 'CABIN', CH: 'CABIN', PH: 'OIL', TG: 'OIL', XG: 'OIL', HM: 'OIL', G: 'FUEL', PS: 'OIL',
  // ECOGARD LD series (partial)
  XC: 'CABIN',
  XA: 'AIRE',
  // PREMIUM GUARD (coarse hint for common PG spin-on/cartridge oil filters)
  PG: 'OIL',
  P: null, DBL: 'OIL', DBA: 'AIRE', ELF: 'OIL', HFA: 'AIRE', HFP: 'FUEL', EAF: 'AIRE', X: null,
  LF: 'OIL', FF: 'FUEL', HF: 'HYDRAULIC',
  AF: 'AIRE',
  BF: 'FUEL',
  WK: 'FUEL', C: 'AIRE', HU: 'OIL', CU: 'CABIN', CUK: 'CABIN',
  51: 'OIL', 33: 'AIRE', 46: 'FUEL',
  L: 'OIL', S: 'OIL', LFP: 'OIL',
  // MAHLE
  OC: 'OIL', LX: 'AIRE', LA: 'CABIN', KC: 'FUEL', KL: 'FUEL', OX: 'OIL',
  // HENGST
  E: 'AIRE', H: 'OIL',
  // RYCO
  Z: 'OIL', A: 'AIRE', R: 'FUEL',
  // FILTRON
  OP: 'OIL', AP: 'AIRE', PP: 'FUEL', K: 'CABIN',
  // PUROLATOR
  L: 'OIL', PL: 'OIL',
  // K&N
  HP: 'OIL',
  // ACDELCO
  PF: 'OIL',
  // BOSCH (generic aftermarket token → no family hint)
  BOSCH: null,
  // UFI (unspecified → no hint)
  UFI: null,
  // HASTINGS (generic)
  HA: null,
  // ROKI / TOKYO ROKI
  RO: null, TR: null
};

// Duty by brand
const DUTY_BY_BRAND = {
  FRAM: 'LD',
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

// Treat ECOGARD as LD (light duty)
DUTY_BY_BRAND.ECOGARD = 'LD';
// Treat BOSCH as LD (automotive aftermarket)
DUTY_BY_BRAND.BOSCH = 'LD';
// Treat PREMIUM GUARD as LD (automotive aftermarket)
DUTY_BY_BRAND['PREMIUM GUARD'] = 'LD';

// FRAM-like patterns (to guide collision resolution)
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
  // Treat hyphenated codes (e.g., 'PS-2010') as non-FRAM-like to avoid K&N collisions
  if (String(code || '').includes('-')) return false;
  const c = normalize(code);
  return FRAM_PATTERNS.some(rx => rx.test(c));
}

// Known collisions: prefer specific brands when ambiguous
const COLLISIONS = {
  // FRAM vs K&N: prefer FRAM when code is FRAM-like
  PS: { preferBrand: 'FRAM', preferDuty: 'LD', preferFamily: 'FUEL', useFramLike: true },
  // Purolator vs Luberfiner: simple L+digits → Purolator
  L: { preferBrand: 'PUROLATOR', preferDuty: 'HD', preferFamily: 'OIL', pattern: /^L\d{3,5}[A-Z]?$/ },
  // ACDELCO PF vs Baldwin or others: prefer ACDELCO for PF+digits
  PF: { preferBrand: 'ACDELCO', preferDuty: 'HD', preferFamily: 'OIL', pattern: /^PF\d{3,5}[A-Z]?$/ },
  // FILTRON OP vs other European brands: prefer FILTRON for OP+digits
  OP: { preferBrand: 'FILTRON', preferDuty: 'HD', preferFamily: 'OIL', pattern: /^OP\d{3,5}[A-Z]?$/ },
  // HP collision: K&N uses 'HP-1234'; FRAM Racing uses 'HP3', 'HP8', etc.
  HP: {
    rules: [
      // After normalization, hyphens are removed, so match plain digits lengths
      { pattern: /^HP\d{3,5}$/, preferBrand: 'K&N', preferDuty: 'HD', preferFamily: 'OIL' },
      { pattern: /^HP\d{1,2}$/, preferBrand: 'FRAM', preferDuty: 'LD', preferFamily: 'OIL' }
    ]
  },
  // ECOGARD vs SAKURA: 'S' + 5 dígitos suele ser ECOGARD (cartridge/spin-on LD OIL)
  S: {
    rules: [
      { pattern: /^S\d{5}$/, preferBrand: 'ECOGARD', preferDuty: 'LD', preferFamily: 'OIL' }
    ]
  },
  // Parker/Racor separator specificity: R90T → PARKER, FUEL
  R: {
    rules: [
      { pattern: /^R90T$/, preferBrand: 'PARKER', preferDuty: 'HD', preferFamily: 'FUEL' },
      { pattern: /^R(12|15|20|25|45|60|120)(T|S)$/, preferBrand: 'PARKER', preferDuty: 'HD', preferFamily: 'FUEL' }
    ]
  }
};

function resolveBrandFamilyDutyByPrefix(code) {
  const p = getPrefix(code);
  if (!p) return null;
  let brand = BRAND_BY_PREFIX[p] || null;
  let family = FAMILY_BY_PREFIX[p] || null;
  let duty = brand ? DUTY_BY_BRAND[brand] || null : null;

  let collision = null;
  const colRule = COLLISIONS[p];
  if (colRule) {
    const c = normalize(code);
    // Support single-rule and multi-rule collisions
    if (Array.isArray(colRule.rules)) {
      for (const r of colRule.rules) {
        if (r.pattern && r.pattern.test(c)) {
          brand = r.preferBrand;
          family = r.preferFamily ?? family;
          duty = r.preferDuty ?? duty;
          collision = `collision_${p.toLowerCase()}_${String(brand || '').toLowerCase()}_priority`;
          break;
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
        collision = `collision_${p.toLowerCase()}_${String(brand || '').toLowerCase()}_priority`;
      }
    }
  }

  // Donaldson P-series fine-grained family hooks (P55 → OIL, P60 → AIRE)
  if (!family && brand === 'DONALDSON' && p === 'P') {
    const c2 = normalize(code);
    const m2 = c2.match(/^P(\d{2})/);
    if (m2) {
      const series = m2[1];
      if (series === '60') family = 'AIRE';
      else if (series === '55') family = 'OIL';
    }
  }

  return { brand, family, duty, prefix: p, collision };
}

// Strict Donaldson regex: permit only canonical series formats
const DONALDSON_STRICT_REGEX = new RegExp(
  '^(P5(0|2|3|4|5)\\d{4}[A-Z]?)$' +
  '|^(DBL|DBA|ELF)\\d{4,5}$' +
  '|^HFA\\d{4,5}$' +
  '|^HFP\\d{5}$' +
  '|^EAF\\d{5}$' +
  '|^P82\\d{4}[A-Z]?$' +
  '|^X\\d{5,6}$' +
  '|^C\\d{6}$' // Donaldson Duralite C-series (e.g., C105004)
);

// Strict FRAM regex: permit only canonical LD series formats
// PH/TG/XG/HM → OIL, CA → AIRE, CF/CH → CABIN, G/PS → FUEL
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