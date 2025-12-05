#!/usr/bin/env node
// Elimina filas en el sheet 'Marinos' por 'normsku'
const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); } catch (_) {}

const { initSheet, getOrCreateMarinosSheet } = require('../src/services/marineImportService');

function usage() {
  console.log('Uso: node scripts/delete_marinos_skus.js EM9-SR20S ET9-F2010S');
}

async function run(skus) {
  const doc = await initSheet();
  const sheet = await getOrCreateMarinosSheet(doc);
  await sheet.loadHeaderRow();
  const rows = await sheet.getRows();
  const idx = new Map();
  for (const r of rows) {
    const k = String(r.normsku || '').toUpperCase().trim();
    if (k) idx.set(k, r);
  }
  const deleted = [];
  const missing = [];
  for (const s of skus) {
    const key = String(s).toUpperCase().trim();
    const row = idx.get(key);
    if (!row) { missing.push(key); continue; }
    await row.delete();
    deleted.push(key);
    console.log(`deleted ${key}`);
  }
  console.log(JSON.stringify({ deleted_count: deleted.length, deleted, missing }, null, 2));
}

(async () => {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help')) { usage(); process.exit(args.includes('--help') ? 0 : 1); }
  await run(args);
  process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });