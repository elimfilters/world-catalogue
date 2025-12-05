#!/usr/bin/env node
const { initSheet, getOrCreateMarinosSheet } = require('../src/services/marineImportService');

function parseArgs(argv) {
  const args = argv.slice(2);
  const out = { quiet: false, skus: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--no-strict-note' || a === '-q') {
      out.quiet = true; // Reserved for consistency; no banner emitted currently
    } else if (a === '--help' || a === '-h') {
      out.help = true;
    } else {
      out.skus.push(a);
    }
  }
  return out;
}

async function audit(skus) {
  const doc = await initSheet();
  const sheet = await getOrCreateMarinosSheet(doc);
  const rows = await sheet.getRows();
  const idx = new Map();
  for (const r of rows) {
    const key = String(r.normsku || r.sku || '').toUpperCase().trim();
    if (key) idx.set(key, r);
  }
  const report = [];
  for (const s of skus) {
    const k = String(s).toUpperCase().trim();
    const found = idx.has(k);
    report.push({ sku: k, found, status: found ? 'PRESENTE' : 'NO ENCONTRADO' });
  }
  console.log(JSON.stringify({ audited: skus.length, report }, null, 2));
}

(async () => {
  const parsed = parseArgs(process.argv);
  if (parsed.help) {
    console.log('Uso: node scripts/audit_marinos_skus.js EM9-SR20S ET9-F2010S [-q|--no-strict-note]');
    process.exit(0);
  }
  if (parsed.skus.length === 0) {
    console.error('Uso: node scripts/audit_marinos_skus.js EM9-SR20S ET9-F2010S [-q|--no-strict-note]');
    process.exit(1);
  }
  await audit(parsed.skus);
  process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });