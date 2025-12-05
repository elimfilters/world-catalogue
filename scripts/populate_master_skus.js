// ============================================================================
// Script: Populate Google Sheet Master with provided SKUs
// Usage examples:
//   SKUS="AF25538,RS5641,AH1135" npm run sheet:populate -- --lang en
//   node scripts/populate_master_skus.js --skus "AF25538, RS5641, AH1135" --lang en
//   node scripts/populate_master_skus.js AF25538 RS5641 AH1135 --lang en
// ----------------------------------------------------------------------------
// Requires Google Sheets credentials via env:
//   - GOOGLE_CREDENTIALS (JSON) OR
//   - GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY
// ----------------------------------------------------------------------------
// This script uses upsertBySku to insert/update rows with minimal data:
//   - sku: tal cual fue suministrado
//   - query_norm: versión normalizada del código (A-Z0-9)
// ============================================================================

try { require('dotenv').config(); } catch (_) {}

const { upsertBySku } = require('../src/services/syncSheetsService');
let detectFilter;
try {
  ({ detectFilter } = require('../src/services/detectionServiceFinal'));
} catch (_) {
  // Optional: detection may not be available in some builds
}

function parseSkusFromArgs() {
  const argv = process.argv.slice(2);
  // Support: --skus "a,b,c" OR positional args; ignore flags
  const skusFlagIndex = argv.findIndex(a => String(a).startsWith('--skus'));
  let rawList = [];
  if (skusFlagIndex !== -1) {
    const flag = argv[skusFlagIndex];
    const parts = String(flag).split('=');
    if (parts.length > 1 && parts[1]) {
      rawList = parts[1].split(',');
    } else if (argv[skusFlagIndex + 1] && !String(argv[skusFlagIndex + 1]).startsWith('--')) {
      rawList = String(argv[skusFlagIndex + 1]).split(',');
    }
  } else if (process.env.SKUS) {
    rawList = String(process.env.SKUS).split(',');
  } else {
    // Positional args: filter out flags and skip their values if using --flag value form
    const filtered = [];
    for (let i = 0; i < argv.length; i++) {
      const a = argv[i];
      if (String(a).startsWith('--')) {
        const [name, val] = String(a).split('=');
        if (!val && i + 1 < argv.length && !String(argv[i + 1]).startsWith('--')) {
          i++; // skip the value token
        }
        continue; // skip flag token
      }
      filtered.push(a);
    }
    rawList = filtered;
  }
  return Array.from(new Set(
    rawList
      .map(s => String(s || '').trim())
      .filter(Boolean)
  ));
}

function normalizeCode(code) {
  return String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function parseLangFromArgs() {
  // Default to English when not provided
  let lang = 'en';
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--lang')) {
      const parts = arg.split('=');
      if (parts.length > 1 && parts[1]) {
        lang = parts[1].trim().toLowerCase();
      } else {
        // Next token may be the value
        const idx = process.argv.indexOf(arg);
        const maybe = process.argv[idx + 1];
        if (maybe && !maybe.startsWith('--')) lang = String(maybe).trim().toLowerCase();
      }
    }
  }
  if (!['en', 'es'].includes(lang)) lang = 'en';
  return lang;
}

async function main() {
  const skus = parseSkusFromArgs();
  if (!skus.length) {
    console.error('❌ No se recibieron SKUs. Use --skus "AF25538,RS5641,..." o pase SKUs como argumentos.');
    process.exit(1);
  }

  console.log(`📋 SKUs a procesar: ${skus.join(', ')}`);
  const lang = parseLangFromArgs();
  console.log(`🌐 Idioma para enriquecimiento/detección: ${lang}`);

  // Validate credentials presence early
  const hasJsonCreds = !!process.env.GOOGLE_CREDENTIALS;
  const hasKeyPair = !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL) && !!process.env.GOOGLE_PRIVATE_KEY;
  if (!hasJsonCreds && !hasKeyPair) {
    console.error('❌ Faltan credenciales de Google Sheets. Configure GOOGLE_CREDENTIALS o GOOGLE_SERVICE_ACCOUNT_EMAIL/GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY.');
    process.exit(1);
  }

  let successCount = 0;
  const noDetect = process.argv.slice(2).some(a => String(a).toLowerCase() === '--no-detect');
  for (const sku of skus) {
    const queryNorm = normalizeCode(sku);
    try {
      if (!noDetect && typeof detectFilter === 'function') {
        // Enriquecer usando el pipeline de detección (guarda en Master internamente)
        const res = await detectFilter(queryNorm, lang, { force: false, generateAll: false });
        if (res && res.status === 'OK') {
          console.log(`✅ Detectado y guardado: ${sku} → ${res.sku}`);
          successCount++;
          continue; // ya se guardó con datos enriquecidos
        }
        console.warn(`↪️ Detección no retornó OK para ${sku}. Fallback a upsert mínimo.`);
      }

      // Fallback: upsert mínimo con solo sku y query_norm
      const data = { sku: sku, query_normalized: queryNorm, minimal: true };
      await upsertBySku(data, { deleteDuplicates: true });
      console.log(`✅ Upsert mínimo realizado para SKU: ${sku} (query_norm: ${queryNorm})`);
      successCount++;
    } catch (e) {
      console.error(`⚠️ Falló procesamiento para ${sku}: ${e.message}. Intentando upsert mínimo...`);
      try {
        const data = { sku: sku, query_normalized: queryNorm, minimal: true };
        await upsertBySku(data, { deleteDuplicates: true });
        console.log(`✅ Upsert mínimo realizado tras excepción para SKU: ${sku}`);
        successCount++;
      } catch (inner) {
        console.error(`❌ Fallback mínimo también falló para ${sku}: ${inner.message}`);
      }
    }
  }

  console.log(`🎯 Completado. Registros procesados: ${skus.length}, exitosos: ${successCount}.`);
}

main().catch(err => {
  console.error('❌ Error inesperado:', err);
  process.exit(1);
});