function isMarineSKU(sku='') {
  return typeof sku === 'string' && sku.startsWith('EM9');
}

function assertMarineNoKits() {
  // explícito: no existen kits marinos
  return true;
}

module.exports = { isMarineSKU, assertMarineNoKits };
