const PREFIXES = {
  PH: { brand: 'Elimfilters', family: 'Premium', duty: 'Heavy' },
  PM: { brand: 'Elimfilters', family: 'Premium', duty: 'Medium' },
  PL: { brand: 'Elimfilters', family: 'Premium', duty: 'Light' },
  SH: { brand: 'Elimfilters', family: 'Standard', duty: 'Heavy' },
  SM: { brand: 'Elimfilters', family: 'Standard', duty: 'Medium' },
  SL: { brand: 'Elimfilters', family: 'Standard', duty: 'Light' },
  EH: { brand: 'Elimfilters', family: 'Economy', duty: 'Heavy' },
  EM: { brand: 'Elimfilters', family: 'Economy', duty: 'Medium' },
  EL: { brand: 'Elimfilters', family: 'Economy', duty: 'Light' }
};

function resolveBrandFamilyDutyByPrefix(prefix) {
  if (!prefix || typeof prefix !== 'string') {
    console.warn('⚠️ [PREFIX] Invalid prefix received:', prefix);
    return { brand: 'Unknown', family: 'Unknown', duty: 'Unknown' };
  }
  
  const upperPrefix = prefix.toUpperCase().substring(0, 2);
  const result = PREFIXES[upperPrefix];
  
  if (!result) {
    console.warn(`⚠️ [PREFIX] No match found for prefix: ${upperPrefix}`);
    return { brand: 'Unknown', family: 'Unknown', duty: 'Unknown' };
  }
  
  console.log(`✅ [PREFIX] Resolved ${upperPrefix} →`, result);
  return result;
}

module.exports = { 
  PREFIXES, 
  resolveBrandFamilyDutyByPrefix 
};
