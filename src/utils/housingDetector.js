function isHousingCode(filterCode) {
  // EA2: Carcasas de aire HD (solo Donaldson)
  // Patrón: G + números (ej: G082527)
  const housingPattern = /^G\d{5,}$/i;
  return housingPattern.test(filterCode.trim());
}

function generateEA2SKU(housingCode) {
  const cleaned = housingCode.replace(/[^0-9]/g, '');
  const last4 = cleaned.slice(-4);
  return `EA2${last4}`;
}

module.exports = {
  isHousingCode,
  generateEA2SKU
};
