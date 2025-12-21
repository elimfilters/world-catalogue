const { validateDonaldsonCode } = require('./donaldsonScraper');
const { validateRacorCode } = require('./racorScraper');
const { validateSierraCode } = require('./sierraScraper');
const { validateFramCode } = require('./framScraper');

async function scraperBridge(code, duty) {
  const normalized = normalize.code(code);
  const hint = prefixMap.resolveBrandFamilyDutyByPrefix(normalized) || {};
  const effectiveDuty = hint.duty || duty || null;

  // HD / Unknown
  const don = await validateDonaldsonCode(normalized);
  if (don?.valid) return don;

  // MARINE → RACOR primero
  if (effectiveDuty === 'MARINE' || hint.brand === 'RACOR') {
    const rac = await validateRacorCode(normalized);
    if (rac?.valid) return rac;
  }

  // MARINE → SIERRA segundo
  if (effectiveDuty === 'MARINE' || hint.brand === 'SIERRA') {
    const sie = await validateSierraCode(normalized);
    if (sie?.valid) return sie;
  }

  // LD
  if (effectiveDuty === 'LD' || hint.brand === 'FRAM') {
    const fr = await validateFramCode(normalized);
    if (fr?.valid) return fr;
  }

  return { valid: false, code: normalized, reason: 'NOT_FOUND_IN_SCRAPERS' };
}
