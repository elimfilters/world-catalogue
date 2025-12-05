try { require('dotenv').config(); } catch (_) {}
const { enrichHDWithFleetguard } = require('../src/services/fleetguardEnrichmentService');
const { upsertBySku, searchInSheet } = require('../src/services/syncSheetsService');
const { getMedia } = require('../src/utils/mediaMapper');

async function run(code, sku) {
  if (!code || !sku) { console.error('Usage: node scripts/tmp_force_fleetguard_enrich.js <P_CODE> <SKU>'); process.exit(1); }
  const base = {
    query_normalized: String(code).toUpperCase().replace(/[^A-Z0-9]/g, ''),
    code_input: code,
    code_oem: code,
    oem_codes: [code],
    duty: 'HD',
    family: 'AIRE',
    sku,
    media: getMedia('AIRE', 'HD'),
    filter_type: 'AIRE',
    source: 'FLEETGUARD',
    cross_reference: 'N/A',
    attributes: { manufactured_by: 'ELIMFILTERS' }
  };
  console.log(`Enriching Fleetguard for ${code} -> ${sku}`);
  const { masterData } = await enrichHDWithFleetguard(base, { codeDonaldson: code, skuInterno: sku });
  masterData.minimal = true;
  // Policy guard: do not create new SKUs here. Only update if SKU already exists in Master.
  const existing = await searchInSheet(sku);
  if (existing && existing.found) {
    await upsertBySku(masterData, { deleteDuplicates: true });
    console.log(`Saved ${sku}`);
  } else {
    console.log(`Skip write: SKU ${sku} not found in Master. Preview-only enrichment done.`);
  }
}

const [c,s] = process.argv.slice(2);
run(c,s).catch(e => { console.error('Error:', e.message); process.exit(1); });
