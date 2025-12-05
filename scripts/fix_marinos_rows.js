#!/usr/bin/env node
// Saneamiento de filas en Google Sheet 'Marinos':
// - Normaliza 'query' con prefixMap.normalize
// - Asegura que 'normsku' esté en mayúsculas si existe
// - Mantiene datos existentes; no borra especificaciones reales

const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); } catch (_) {}

const { initSheet, getOrCreateMarinosSheet } = require('../src/services/marineImportService');
const prefixMap = require('../src/config/prefixMap');

// Columnas de especificación (referencia)
const SPEC_COLUMNS = [
  'height_mm','outer_diameter_mm','thread_size','micron_rating',
  'operating_temperature_min_c','operating_temperature_max_c','fluid_compatibility','disposal_method',
  'gasket_od_mm','gasket_id_mm','bypass_valve_psi','beta_200','hydrostatic_burst_psi','dirt_capacity_grams',
  'rated_flow_gpm','rated_flow_cfm','operating_pressure_min_psi','operating_pressure_max_psi','weight_grams',
  'panel_width_mm','panel_depth_mm','water_separation_efficiency_percent','drain_type','inner_diameter_mm','pleat_count',
  'seal_material','housing_material','iso_main_efficiency_percent','iso_test_method','manufacturing_standards',
  'certification_standards','service_life_hours','change_interval_km'
];

async function run({ dryRun = false } = {}) {
  const doc = await initSheet();
  const sheet = await getOrCreateMarinosSheet(doc);
  await sheet.loadHeaderRow();
  const rows = await sheet.getRows();

  let processed = 0;
  let normalizedQuery = 0;
  let uppercasedNormsku = 0;

  for (const row of rows) {
    let changed = false;

    // Normalizar 'query' si trae valor
    const qRaw = String(row.query || '').trim();
    if (qRaw) {
      const qNorm = prefixMap.normalize(qRaw);
      if (qNorm !== qRaw) { row.query = qNorm; normalizedQuery++; changed = true; }
    }

    // Asegurar 'normsku' en mayúsculas
    const nsRaw = String(row.normsku || '').trim();
    if (nsRaw) {
      const nsUp = nsRaw.toUpperCase();
      if (nsUp !== nsRaw) { row.normsku = nsUp; uppercasedNormsku++; changed = true; }
    }

    if (changed && !dryRun) {
      await row.save();
    }
    if (changed) processed++;
  }

  console.log(JSON.stringify({
    ok: true,
    dryRun,
    rows_total: rows.length,
    rows_changed: processed,
    normalized_query: normalizedQuery,
    uppercased_normsku: uppercasedNormsku
  }, null, 2));
}

(async () => {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  await run({ dryRun });
  process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });