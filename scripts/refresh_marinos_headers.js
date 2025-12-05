#!/usr/bin/env node
// Refresca los encabezados del sheet 'Marinos' al esquema actual
const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); } catch (_) {}

const { initSheet, getOrCreateMarinosSheet } = require('../src/services/marineImportService');

async function run() {
  const doc = await initSheet();
  const sheet = await getOrCreateMarinosSheet(doc);
  await sheet.loadHeaderRow();
  const before = Array.isArray(sheet.headerValues) ? sheet.headerValues : [];
  console.log('Encabezados actuales:', before);
  // getOrCreateMarinosSheet ya asegura headers; forzamos setHeaderRow para garantizar sincronía
  await sheet.setHeaderRow(require('../src/services/marineImportService').INPUT_HEADERS || sheet.headerValues);
  await sheet.loadHeaderRow();
  const after = sheet.headerValues;
  console.log('Encabezados actualizados:', after);
}

(async () => {
  await run();
  process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });