#!/usr/bin/env node
// Busca filas en el sheet 'Marinos' por normsku o query
const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); } catch (_) {}

const { initSheet, getOrCreateMarinosSheet } = require('../src/services/marineImportService');

function usage() {
  console.log('Uso: node scripts/search_in_marinos_sheet.js <valor> [--by=query|normsku]');
}

async function run(value, by = 'normsku') {
  const doc = await initSheet();
  const sheet = await getOrCreateMarinosSheet(doc);
  await sheet.loadHeaderRow();
  const rows = await sheet.getRows();
  const target = String(value || '').toUpperCase().trim();
  const field = by === 'query' ? 'query' : 'normsku';
  const found = rows.find(r => String(r[field] || '').toUpperCase().trim() === target);
  if (!found) {
    console.log(JSON.stringify({ ok: false, reason: 'NOT_FOUND', by: field, value: target }, null, 2));
    return;
  }
  const obj = {};
  for (const h of sheet.headerValues) obj[h] = found[h];
  console.log(JSON.stringify({ ok: true, by: field, value: target, row: obj }, null, 2));
}

(async () => {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help')) { usage(); process.exit(args.includes('--help') ? 0 : 1); }
  const value = args[0];
  const byArg = args.find(a => a.startsWith('--by='));
  const by = byArg ? byArg.split('=')[1] : 'normsku';
  await run(value, by);
  process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });