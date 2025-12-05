// Preview buildRowData with custom OEM codes list without writing to Sheets
// Usage: node repo/scripts/preview_build_row_custom.js <code_or_sku> "IT2086,ARS1849,..." [--lang=es|en]
'use strict';
try { require('dotenv').config(); } catch (_) {}

const syncSvc = require('../src/services/syncSheetsService');
const { buildRowData } = syncSvc;

// Prevent any accidental writes in preview
if (syncSvc && typeof syncSvc.upsertBySku === 'function') {
  syncSvc.upsertBySku = async function previewUpsertStub() {
    console.log('⚠️ Preview mode: skipping upsert to Google Sheets');
    return { ok: true, preview: true };
  };
}

const args = process.argv.slice(2);
const codeOrSku = args[0];
const oemCsv = args[1] || '';
// Allow optional third arg for keeping an existing SKU in preview
const providedSku = (args[2] && !String(args[2]).startsWith('--')) ? args[2] : '';
const langArg = (args.find(a => a.startsWith('--lang=')) || '--lang=es').split('=')[1];

const normalizeCode = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const oemList = oemCsv.split(',').map(s => s.trim()).filter(Boolean);

async function main() {
  if (!codeOrSku || !oemList.length) {
    console.error('Uso: node repo/scripts/preview_build_row_custom.js <code_or_sku> "<oem1,oem2,...>" [sku] [--lang=es|en]');
    process.exit(1);
  }
  process.env.DEFAULT_LANG = langArg;
  const data = {
    query_normalized: normalizeCode(codeOrSku),
    code_input: codeOrSku,
    sku: providedSku ? String(providedSku).toUpperCase().trim() : '',
    duty: 'HD',
    family: 'AIRE',
    oem_codes: oemList,
    cross_reference: [],
    attributes: {}
  };

  const row = buildRowData(data);
  console.log('=== Preview (Master row) ===');
  console.log(JSON.stringify(row, null, 2));
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });