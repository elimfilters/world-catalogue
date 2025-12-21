// ============================================================================
// PREFIX COLLISION CHECK — ELIMFILTERS (FINAL)
// Valida que ningún SKU ELIMFILTERS pase validaciones de entrada (forma)
// ============================================================================

const PREFIXES = require('./src/config/prefixes');
const prefixMap = require('./src/config/prefixMap');

// Prefijos reales de CREACIÓN
const CREATION_PREFIXES = Object.freeze(
  Object.values(PREFIXES)
);

// Simulador de SKUs ELIMFILTERS
function fakeSku(prefix) {
  return prefix + '1234';
}

console.log('🔍 Running prefix collision check...\n');

let collisions = [];

for (const prefix of CREATION_PREFIXES) {
  const sku = fakeSku(prefix);
  const validation = prefixMap.validate(sku);

  if (validation.valid) {
    collisions.push({
      prefix,
      sku,
      acceptedBy: validation.pattern
    });
  }
}

if (collisions.length) {
  console.error('❌ COLLISION DETECTED\n');
  console.table(collisions);
  process.exit(1);
}

console.log('✅ OK — No SKU creation prefix is accepted by input validator\n');
process.exit(0);
