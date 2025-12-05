// Resolver centralizado para columnas A–D (query, normsku, duty_type, type)
// Usa reglas de prefijos/colisiones para deducir brand/family/duty y mapea a tipo canónico.

const prefixMap = require('../config/prefixMap');

function familyToCanonicalType(fam) {
  const f = String(fam || '').toUpperCase();
  switch (f) {
    case 'AIRE': return 'Aire';
    case 'CABIN': return 'Cabina';
    case 'FUEL': return 'Fuel';
    case 'OIL': return 'Oil';
    case 'HYDRAULIC': return 'Hidraulic';
    case 'COOLANT': return 'Coolant';
    case 'AIR_DRYER': return 'Air Dryer';
    case 'TURBINE': return 'Turbine Series';
    case 'HOUSING': return 'Carcazas';
    default: return '';
  }
}

// codeInput puede ser `query_normalized`, `code_input` o un SKU/código OEM.
// existing puede traer { duty, type, family } ya detectados para no sobreescribir.
function resolveAToD(codeInput, existing = {}) {
  const query = String(codeInput || '').trim();
  const normQ = prefixMap.normalize(query);
  const hint = prefixMap.resolveBrandFamilyDutyByPrefix(normQ);
  const dutyResolved = hint?.brand ? (prefixMap.DUTY_BY_BRAND[hint.brand] || null) : (hint?.duty || null);
  const familyResolved = hint?.family || (existing.family ? String(existing.family).toUpperCase() : null);
  const typeResolved = familyToCanonicalType(familyResolved);
  return {
    query: normQ,
    normsku: String(existing.sku || '').toUpperCase(),
    duty_type: existing.duty || dutyResolved || '',
    type: existing.type || typeResolved || ''
  };
}

module.exports = {
  resolveAToD
};