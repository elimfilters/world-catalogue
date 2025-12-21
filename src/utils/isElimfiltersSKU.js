// Detecta SKU ELIMFILTERS SOLO por prefijos de CREACIÓN (prefixes.js)
const PREFIXES = require('../config/prefixes');

const CREATION_PREFIXES = Object.freeze(
  Object.values(PREFIXES)
);

function isElimfiltersSKU(code = "") {
  const c = String(code).trim().toUpperCase();
  return CREATION_PREFIXES.some(p => c.startsWith(p));
}

module.exports = { isElimfiltersSKU };
