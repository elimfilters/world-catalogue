const KIT_RULES = Object.freeze({
  LD: { prefix: 'EK3', allowFamilies: ['OIL','FUEL','AIR','CABIN'] },
  HD: { prefix: 'EK5', allowFamilies: ['OIL','FUEL','AIR','HYDRAULIC','COOLANT','SEPARATOR'] }
});

function isKitSKU(sku='') {
  return typeof sku === 'string' && (sku.startsWith('EK3') || sku.startsWith('EK5'));
}

function validateKit({ duty, sku, components = [] }) {
  if (!isKitSKU(sku)) return { ok:false, reason:'NOT_A_KIT' };
  const rule = KIT_RULES[duty];
  if (!rule) return { ok:false, reason:'INVALID_DUTY' };
  if (!sku.startsWith(rule.prefix)) return { ok:false, reason:'PREFIX_MISMATCH' };
  if (!Array.isArray(components) || components.length < 2) {
    return { ok:false, reason:'MIN_COMPONENTS_2' };
  }
  for (const c of components) {
    if (!rule.allowFamilies.includes(c.family)) {
      return { ok:false, reason:`FAMILY_NOT_ALLOWED:${c.family}` };
    }
  }
  return { ok:true };
}

module.exports = { isKitSKU, validateKit };
