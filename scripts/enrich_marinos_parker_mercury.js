#!/usr/bin/env node
// Enriquecimiento focalizado para filas "Marinos": Parker/Racor, Mercury/MerCruiser y Sierra
// Población de: micron_rating, rated_flow_gpm, applications (engine/equipment), y cross refs
const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); } catch (_) {}

const { initSheet, getOrCreateMarinosSheet } = require('../src/services/marineImportService');
const { scraperBridge } = require('../src/scrapers/scraperBridge');
const { extractParkerSpecs, extractMercurySpecs, extractSierraSpecs } = require('../src/services/technicalSpecsScraper');

function toArray(list) {
  if (Array.isArray(list)) return list.filter(Boolean);
  const s = String(list || '')
    .split(/[,;\n\t/]+/)
    .map(x => x.trim())
    .filter(Boolean);
  return Array.from(new Set(s));
}

function uniqJoin(list) {
  const arr = Array.isArray(list) ? list : (list ? [list] : []);
  const norm = arr
    .map(v => typeof v === 'string' ? v : (v?.toString?.() || ''))
    .map(s => s.trim())
    .filter(Boolean);
  return Array.from(new Set(norm)).join(', ');
}

function gphToGpm(gph) {
  const n = Number(gph);
  if (!isFinite(n) || n <= 0) return '';
  return (n / 60).toFixed(2);
}

function lphToGpm(lph) {
  const n = Number(lph);
  if (!isFinite(n) || n <= 0) return '';
  return (n / 3.785411784 / 60).toFixed(2);
}

function lpmToGpm(lpm) {
  const n = Number(lpm);
  if (!isFinite(n) || n <= 0) return '';
  return (n / 3.785411784).toFixed(2);
}

function computeRatedFlowGpm(perf = {}) {
  // Preferir GPH si existe; luego LPH/LPM
  if (perf.flow_gph) {
    const gpm = gphToGpm(perf.flow_gph);
    if (gpm) return gpm;
  }
  if (perf.flow_lph) {
    const gpm = lphToGpm(perf.flow_lph);
    if (gpm) return gpm;
  }
  if (perf.flow_lpm) {
    const gpm = lpmToGpm(perf.flow_lpm);
    if (gpm) return gpm;
  }
  return '';
}

function appsToRaw(list = []) {
  try {
    const arr = Array.isArray(list) ? list : [];
    const names = arr
      .map(a => (typeof a === 'string' ? a : (a?.name || '')))
      .map(s => s.trim())
      .filter(Boolean);
    return uniqJoin(names);
  } catch (_) { return ''; }
}

async function enrichRow(row, opts) {
  const code = String(row.query || '').trim();
  if (!code) return { skipped: true };
  let classification;
  try {
    classification = await scraperBridge(code, 'MARINE');
  } catch (_) {}
  if (!classification || !classification.valid) return { skipped: true };
  const src = String(classification.source || '').toUpperCase();

  let specs;
  try {
    if (src === 'PARKER') {
      specs = await extractParkerSpecs(code);
    } else if (src === 'MERCRUISER') {
      specs = await extractMercurySpecs(code);
    } else if (src === 'SIERRA') {
      specs = await extractSierraSpecs(code);
    }
  } catch (err) {
    return { skipped: true, error: `specs_error: ${err.message}` };
  }
  if (!specs) return { skipped: true };

  const perf = specs.performance || {};
  const tech = specs.technical_details || {};

  const changes = {};
  const beforeVals = {};
  // Micraje
  if (perf.micron_rating && String(row.micron_rating || '').trim() !== String(perf.micron_rating)) {
    beforeVals.micron_rating = String(row.micron_rating || '').trim();
    changes.micron_rating = String(perf.micron_rating);
  }
  // Caudal GPM
  const gpm = computeRatedFlowGpm(perf);
  if (gpm && String(row.rated_flow_gpm || '').trim() !== String(gpm)) {
    beforeVals.rated_flow_gpm = String(row.rated_flow_gpm || '').trim();
    changes.rated_flow_gpm = String(gpm);
  }
  // Compatibilidad de fluidos (si vacío)
  if (tech.fluid_compatibility && !String(row.fluid_compatibility || '').trim()) {
    beforeVals.fluid_compatibility = String(row.fluid_compatibility || '').trim();
    changes.fluid_compatibility = String(tech.fluid_compatibility);
  }
  // Aplicaciones
  const enginesRaw = appsToRaw(specs.engine_applications);
  const equipmentsRaw = appsToRaw(specs.equipment_applications);
  if (src === 'PARKER' || src === 'SIERRA') {
    // Consolidación con guardrail de volumen: no reemplazar lista rica por una pobre
    const existingEngines = (String(row.engine_applications_raw || '')).split(/[,;\n\t/]+/).map(s => s.trim()).filter(Boolean);
    const scrapedEngines = (String(enginesRaw || '')).split(/[,;\n\t/]+/).map(s => s.trim()).filter(Boolean);
    const enginesMergedList = (
      scrapedEngines.length >= MIN_APP_THRESHOLD
        ? scrapedEngines
        : (existingEngines.length >= MIN_APP_THRESHOLD
            ? Array.from(new Set([ ...existingEngines, ...scrapedEngines ]))
            : scrapedEngines)
    );
    const enginesNext = enginesMergedList.join(', ');
    if (String(row.engine_applications_raw || '').trim() !== enginesNext) {
      beforeVals.engine_applications_raw = String(row.engine_applications_raw || '').trim();
      changes.engine_applications_raw = enginesNext;
    }

    const existingEquipments = (String(row.equipment_applications_raw || '')).split(/[,;\n\t/]+/).map(s => s.trim()).filter(Boolean);
    const scrapedEquipments = (String(equipmentsRaw || '')).split(/[,;\n\t/]+/).map(s => s.trim()).filter(Boolean);
    const equipmentsMergedList = (
      scrapedEquipments.length >= MIN_APP_THRESHOLD
        ? scrapedEquipments
        : (existingEquipments.length >= MIN_APP_THRESHOLD
            ? Array.from(new Set([ ...existingEquipments, ...scrapedEquipments ]))
            : (scrapedEquipments.length ? scrapedEquipments : existingEquipments))
    );
    const equipmentsNext = equipmentsMergedList.join(', ');
    if (String(row.equipment_applications_raw || '').trim() !== equipmentsNext) {
      beforeVals.equipment_applications_raw = String(row.equipment_applications_raw || '').trim();
      changes.equipment_applications_raw = equipmentsNext;
    }
  } else {
    // Comportamiento por defecto: sobrescribir si el scraper mejora la lista
    if (enginesRaw && String(row.engine_applications_raw || '').trim() !== enginesRaw) {
      beforeVals.engine_applications_raw = String(row.engine_applications_raw || '').trim();
      changes.engine_applications_raw = enginesRaw;
    }
    if (equipmentsRaw && String(row.equipment_applications_raw || '').trim() !== equipmentsRaw) {
      beforeVals.equipment_applications_raw = String(row.equipment_applications_raw || '').trim();
      changes.equipment_applications_raw = equipmentsRaw;
    }
  }
  // OEM y cross refs
  const existingOEM = toArray(row.oem_codes_raw);
  const existingCross = toArray(row.cross_reference_raw);
  const nextOEM = uniqJoin([code, ...(specs.oem_codes || []), ...existingOEM]);
  if (nextOEM && nextOEM !== uniqJoin(existingOEM)) { beforeVals.oem_codes_raw = uniqJoin(existingOEM); changes.oem_codes_raw = nextOEM; }

  if (src === 'PARKER' || src === 'SIERRA') {
    // Sobrescribir cross con valores limpiados del scraper (incluso vacío)
    const crossRaw = uniqJoin(specs.cross_reference || []);
    if (crossRaw !== uniqJoin(existingCross)) { beforeVals.cross_reference_raw = uniqJoin(existingCross); changes.cross_reference_raw = crossRaw; }
  } else {
    // Acumular en otras fuentes
    const nextCross = uniqJoin([...(specs.cross_reference || []), ...existingCross]);
    if (nextCross && nextCross !== uniqJoin(existingCross)) { beforeVals.cross_reference_raw = uniqJoin(existingCross); changes.cross_reference_raw = nextCross; }
  }

  const changedKeys = Object.keys(changes);
  if (changedKeys.length === 0) return { skipped: true };

  // Persistir cambios
  Object.entries(changes).forEach(([k, v]) => { row[k] = v; });
  if (opts.apply) await row.save();

  const diff = {};
  for (const k of changedKeys) { diff[k] = { before: beforeVals[k] || '', after: changes[k] }; }
  const sourceCounts = ((specs.meta || {}).source_counts) || null;
  return { updated: true, source: src, changed: changedKeys, diff, source_counts: sourceCounts };
}

async function run() {
  const apply = process.argv.includes('--apply');
  // Optional filtering: provide SKUs after flags, e.g. node script ... --apply EM9-SR90T ET9660FH
  const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const byArg = (process.argv.find(a => a.startsWith('--by=')) || '');
  const byField = (byArg.split('=')[1] || 'normsku').toLowerCase();
  const doc = await initSheet();
  const sheet = await getOrCreateMarinosSheet(doc);
  const rows = await sheet.getRows();
  let targetRows = rows;
  if (args.length > 0) {
    // Build index by requested field
    const idx = new Map();
    for (const r of rows) {
      const key = String(r[byField === 'query' ? 'query' : 'normsku'] || '').toUpperCase().trim();
      if (key) idx.set(key, r);
    }
    targetRows = args.map(s => idx.get(String(s).toUpperCase().trim())).filter(Boolean);
  }

  let updated = 0;
  const bySource = { PARKER: 0, MERCRUISER: 0, SIERRA: 0 };
  const changesLog = [];

  for (const row of targetRows) {
    const res = await enrichRow(row, { apply });
    if (res && res.updated) {
      updated++;
      if (res.source) bySource[res.source] = (bySource[res.source] || 0) + 1;
      changesLog.push({ query: row.query, normsku: row.normsku, source: res.source, changed: res.changed, diff: res.diff, source_counts: res.source_counts });
    }
  }

  console.log(JSON.stringify({ ok: true, updated, bySource, changes: changesLog }, null, 2));
}

(async () => {
  await run();
  process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });
// Umbral mínimo para considerar una lista "rica" al consolidar
const MIN_APP_THRESHOLD = 6;