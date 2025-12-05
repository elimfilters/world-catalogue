#!/usr/bin/env node
// Inserta/actualiza filas de prueba en 'Marinos' usando upsertMarinosBySku
const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); } catch (_) {}

const { upsertMarinosBySku } = require('../src/services/marineImportService');

function usage() {
  console.log('Uso: node scripts/upsert_marinos_test_rows.js <SKU> family=MARINE duty=HD oem=R12T cross=1234 engines=Mercury equipments=Bote');
}

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.length === 0 || args.includes('--help')) return null;
  const out = { sku: null, duty: 'HD', family: 'MARINE', oem: [], cross: [], engines: [], equipments: [] };
  for (const a of args) {
    const [k, v] = a.includes('=') ? a.split('=') : [null, null];
    if (!k) { out.sku = (out.sku || a); continue; }
    if (k === 'duty') out.duty = v;
    else if (k === 'family') out.family = v;
    else if (k === 'oem') out.oem = v.split(',').map(s => s.trim()).filter(Boolean);
    else if (k === 'cross') out.cross = v.split(',').map(s => s.trim()).filter(Boolean);
    else if (k === 'engines') out.engines = v.split(',').map(s => s.trim()).filter(Boolean);
    else if (k === 'equipments') out.equipments = v.split(',').map(s => s.trim()).filter(Boolean);
  }
  return out;
}

async function run(opts) {
  const payload = {
    sku: String(opts.sku || '').toUpperCase().trim(),
    duty: opts.duty,
    family: opts.family,
    code_input: (opts.oem[0] || ''),
    code_oem: (opts.oem[0] || ''),
    oem_codes: opts.oem,
    cross_reference: opts.cross,
    applications: opts.engines,
    equipment_applications: opts.equipments
  };
  await upsertMarinosBySku(payload);
}

(async () => {
  const opts = parseArgs(process.argv);
  if (!opts) { usage(); process.exit(opts === null ? 1 : 0); }
  await run(opts);
  process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });