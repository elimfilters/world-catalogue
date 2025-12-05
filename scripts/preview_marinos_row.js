#!/usr/bin/env node
// Previsualiza cómo se mapearía un payload al esquema de 'Marinos' sin escribir
const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); } catch (_) {}

const prefixMap = require('../src/config/prefixMap');
const { buildRowData } = require('../src/services/syncSheetsService');
const { INPUT_HEADERS } = require('../src/services/marineImportService');

function parseArgs(argv) {
  const args = argv.slice(2);
  const out = { sku: null, duty: 'HD', family: null, oem: [], cross: [], engines: [], equipments: [] };
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

function pruneToHeaders(obj) {
  const allowed = new Set(INPUT_HEADERS);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (!allowed.has(k)) continue;
    out[k] = v;
  }
  return out;
}

async function run(opts) {
  const skuNorm = String(opts.sku || '').toUpperCase().trim();
  if (!skuNorm) { console.error('Debe indicar un SKU. Ej: EM9-SR20S'); process.exit(1); }
  const base = buildRowData({ sku: skuNorm, duty: opts.duty, family: opts.family, oem_codes: opts.oem, cross_reference: opts.cross, applications: opts.engines, equipment_applications: opts.equipments });
  const rowData = {
    ...base,
    query: prefixMap.normalize(opts.oem[0] || skuNorm),
    normsku: skuNorm,
    oem_codes_raw: (opts.oem || []).join(', '),
    cross_reference_raw: (opts.cross || []).join(', '),
    engine_applications_raw: (opts.engines || []).join(', '),
    equipment_applications_raw: (opts.equipments || []).join(', ')
  };
  console.log(JSON.stringify(pruneToHeaders(rowData), null, 2));
}

(async () => {
  const opts = parseArgs(process.argv);
  await run(opts);
  process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });