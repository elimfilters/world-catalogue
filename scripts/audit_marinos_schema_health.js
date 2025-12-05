#!/usr/bin/env node
// Auditoría de salud del esquema en 'Marinos': verifica campos esenciales por fila
const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); } catch (_) {}

const { initSheet, getOrCreateMarinosSheet } = require('../src/services/marineImportService');

const REQUIRED_FIELDS = ['query','normsku','duty_type','type','subtype','media_type'];

async function run() {
  const doc = await initSheet();
  const sheet = await getOrCreateMarinosSheet(doc);
  await sheet.loadHeaderRow();
  const rows = await sheet.getRows();
  const issues = [];

  for (const row of rows) {
    const id = String(row.normsku || '').toUpperCase().trim() || String(row.query || '').trim();
    const missing = REQUIRED_FIELDS.filter(f => !String(row[f] || '').trim());
    if (missing.length > 0) {
      issues.push({ id, missing });
    }
  }

  console.log(JSON.stringify({ rows_total: rows.length, issues_count: issues.length, issues }, null, 2));
}

(async () => {
  await run();
  process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });