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

const PREFIXES = require('../config/prefixes');

/**
 * Normalización de textos OEM.
 */
function normalize(code) {
  return String(code || '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[-_]/g, '');
}

/**
 * Detección primaria de prefijo OEM (NO ELIMFILTERS).
 */
function getPrefixOEM(code) {
  const c = normalize(code);
  if (c.startsWith('BOSCH')) return 'BOSCH';

  const mLetters = c.match(/^([A-Z]{1,4})/);
  if (mLetters) return mLetters[1];

  const mDigits = c.match(/^(\d{2,3})/);
  if (mDigits) return mDigits[1];

  return null;
}

/**
 * ================================================================
 * PREFIX MAP — SOLO OEM → FAMILY/DUTY (NO ELIMFILTERS)
 * ================================================================
 */

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

/**
 * ================================================================
 * MASTER OEM RESOLUTION
 * ================================================================
 */
function resolveBrandFamilyDutyByPrefix(code) {
  const p = getPrefixOEM(code);
  if (!p) return null;

  const brand = BRAND_BY_PREFIX[p] || null;
  const family = FAMILY_BY_PREFIX[p] || null;
  const duty = brand ? DUTY_BY_BRAND[brand] || null : null;

  return { brand, family, duty, prefix: p };
}

/**
 * ================================================================
 * EXPORTACIONES (NO GENERAN PREFIJOS ELIMFILTERS)
 * ================================================================
 */
module.exports = {
  normalize,
  getPrefix: getPrefixOEM,
  BRAND_BY_PREFIX,
  FAMILY_BY_PREFIX,
  DUTY_BY_BRAND,
  resolveBrandFamilyDutyByPrefix
};