#!/usr/bin/env node
const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); } catch (_) {}

const { importMarinos } = require('../src/services/marineImportService');

function parseArgs(argv) {
  const args = argv.slice(2);
  return { apply: args.includes('--apply') };
}

(async () => {
  const opts = parseArgs(process.argv);
  const dryRun = !opts.apply;
  console.log(`→ Ejecutando importador de Marinos (dryRun=${dryRun})...`);
  const res = await importMarinos({ dryRun });
  console.log(JSON.stringify(res, null, 2));
  process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });