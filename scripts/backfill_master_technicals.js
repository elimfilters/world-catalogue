'use strict';
try { require('dotenv').config(); } catch (_) {}

// Backfill technical columns in Google Sheet Master using Fleetguard fallback scraper
// Usage:
//   node scripts/backfill_master_technicals.js P554004 LF667 LF9667
// Env:
//   - GOOGLE_CREDENTIALS or GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY
//   - Optional: HEADLESS='true' to run scraper headless

const { scrapeFleetguardBySearch } = require('../src/scrapers/fleetguardScraper');
const { upsertBySku, searchInSheet } = require('../src/services/syncSheetsService');
let detectFilter;
try { ({ detectFilter } = require('../src/services/detectionServiceFinal')); } catch (_) {}

function normalizeCode(code) {
  return String(code || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function buildAttributesFromScrape(out) {
  const t = out && out.technical ? out.technical : {};
  return {
    height_mm: t.height_mm ?? null,
    outer_diameter_mm: t.outer_diameter_mm ?? null,
    inner_diameter_mm: t.inner_diameter_mm ?? null,
    gasket_od_mm: t.gasket_od_mm ?? null,
    gasket_id_mm: t.gasket_id_mm ?? null,
    thread_size: t.thread_size ?? null,
    rated_flow_gpm: t.rated_flow_gpm ?? null,
    hydrostatic_burst_psi: t.hydrostatic_burst_psi ?? null,
    iso_test_method: t.iso_test_method ?? null,
    micron_rating: t.micron_rating ?? null,
  };
}

async function backfillOne(code) {
  const queryNorm = normalizeCode(code);
  console.log(`\n🔧 Backfill técnicas para: ${queryNorm}`);

  // Find existing row by code, normsku, OEM or cross-reference
  let found;
  try {
    found = await searchInSheet(queryNorm);
  } catch (e) {
    console.log(`⚠️  No se pudo buscar en Master: ${e.message}`);
  }
  if (!found || !found.found) {
    console.log('ℹ️ Fila no encontrada en Master. Intentando detección para crear SKU y fila...');
    try {
      if (typeof detectFilter === 'function') {
        await detectFilter(queryNorm, 'es', { force: false, generateAll: false });
      } else {
        console.log('⚠️ detectFilter no disponible en esta build.');
      }
      found = await searchInSheet(queryNorm);
      if (!found || !found.found) {
        console.log('❌ No se pudo crear ni localizar la fila en Master.');
        return false;
      }
    } catch (e) {
      console.log(`❌ Detección falló: ${e.message}`);
      return false;
    }
  }

  // Scrape technicals via Fleetguard fallback
  let scraped;
  try {
    scraped = await scrapeFleetguardBySearch(queryNorm);
  } catch (e) {
    console.log(`❌ Scrape Fleetguard falló: ${e.message}`);
    return false;
  }

  const attrs = buildAttributesFromScrape(scraped);
  const hasAny = Object.values(attrs).some(v => v !== null && v !== '' && v !== undefined);
  if (!hasAny) {
    console.log('ℹ️ No se obtuvieron métricas técnicas; no se realizará upsert.');
    return false;
  }

  // Upsert to Master using existing SKU (normsku)
  const payload = {
    query: found.query || queryNorm,
    sku: found.normsku,
    normsku: found.normsku,
    duty_type: found.duty_type || undefined,
    type: found.type || undefined,
    subtype: found.subtype || undefined,
    description: found.description || undefined,
    attributes: attrs,
  };

  try {
    await upsertBySku(payload, { deleteDuplicates: false });
    console.log(`✅ Upsert realizado: ${found.normsku} con técnicas actualizadas.`);
    return true;
  } catch (e) {
    console.log(`❌ Error al upsert en Master: ${e.message}`);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2).filter(Boolean);
  if (!args.length) {
    console.error('❌ Proporcione códigos para backfill. Ejemplo: node scripts/backfill_master_technicals.js P554004 LF667');
    process.exit(1);
  }

  const credsOk = !!process.env.GOOGLE_CREDENTIALS || (!!process.env.GOOGLE_PRIVATE_KEY && !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL));
  if (!credsOk) {
    console.error('❌ Faltan credenciales de Google Sheets. Configure GOOGLE_CREDENTIALS o GOOGLE_SERVICE_ACCOUNT_EMAIL/GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY.');
    process.exit(1);
  }

  let ok = 0;
  for (const code of args) {
    const res = await backfillOne(code);
    if (res) ok++;
  }
  console.log(`\n📊 Backfill completado: ${ok}/${args.length} códigos con técnicas actualizadas.`);
}

main().catch(err => {
  console.error('Fatal:', err && err.message ? err.message : err);
  process.exit(1);
});