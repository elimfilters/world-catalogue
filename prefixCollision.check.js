// ============================================================================
// PREFIX COLLISION CHECK — ELIMFILTERS (CREACIÓN vs VALIDACIÓN)
// EJECUCIÓN DIRECTA (NO JEST)
// ============================================================================

const { CREATION_PREFIXES } = require('./src/utils/isElimfiltersSKU');
const prefixMap = require('./src/config/prefixMap');

const collisions = [];

for (const prefix of CREATION_PREFIXES) {
  const sku = `${prefix}1234`;
  const validation = prefixMap.validate(sku);

  if (validation.valid) {
    collisions.push({
      prefix,
      sku,
      matchedPattern: validation.pattern
    });
  }
}

if (collisions.length > 0) {
  console.error('❌ PREFIX COLLISION DETECTED');
  console.error(collisions);
  process.exit(1);
}

console.log('✅ No prefix collisions detected.');
process.exit(0);
