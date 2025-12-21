const PREFIXES = require('../config/prefixes');

const ELIMFILTERS_PREFIXES = Object.freeze(
  Object.values(PREFIXES)
);

function isElimfiltersSKU(code) {
  if (!code) return false;
  const normalized = String(code).toUpperCase().trim();

  return ELIMFILTERS_PREFIXES.some(prefix =>
    normalized.startsWith(prefix)
  );
}

module.exports = { isElimfiltersSKU };
