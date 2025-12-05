#!/usr/bin/env node
// Deduplica y limpia listas crudas en 'Marinos' (oem/cross/applications)
const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); } catch (_) {}

const { initSheet, getOrCreateMarinosSheet } = require('../src/services/marineImportService');

function normalizeList(val) {
  const arr = Array.isArray(val) ? val : String(val || '').split(/[,;\n\t/]+/).map(x => x.trim());
  return Array.from(new Set(arr.filter(Boolean))).join(', ');
}

async function run({ dryRun = true } = {}) {
  const doc = await initSheet();
  const sheet = await getOrCreateMarinosSheet(doc);
  await sheet.loadHeaderRow();
  const rows = await sheet.getRows();
  const targets = ['oem_codes_raw','cross_reference_raw','engine_applications_raw','equipment_applications_raw'];
  let changed = 0;

  for (const row of rows) {
    let touched = false;
    for (const col of targets) {
      const before = row[col];
      const after = normalizeList(before);
      if (String(after) !== String(before)) { row[col] = after; touched = true; }
    }
    if (touched) {
      changed++;
      if (!dryRun) await row.save();
    }
  }

  console.log(JSON.stringify({ ok: true, dryRun, rows_total: rows.length, rows_changed: changed }, null, 2));
}

(async () => {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  await run({ dryRun: !apply });
  if (!apply) console.log('Dry-run. Use --apply to persist changes.');
  process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });