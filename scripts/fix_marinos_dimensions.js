#!/usr/bin/env node
// Normaliza y estandariza unidades/números en campos técnicos de 'Marinos'
const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); } catch (_) {}

const { initSheet, getOrCreateMarinosSheet } = require('../src/services/marineImportService');

// Conversión básica a número y unidades estándar
function parseNumber(val) {
  if (typeof val === 'number') return val;
  const s = String(val || '').trim();
  if (!s) return null;
  const n = Number(s.replace(/[^0-9.+-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function inchesToMm(n) { return n * 25.4; }

function normalizeDim(val) {
  const s = String(val || '').trim();
  if (!s) return '';
  // Ejemplos: "3.5 in", "89 mm", "3-1/2 in"
  const frac = s.match(/(\d+)\s*\/\s*(\d+)/);
  const hasIn = /\bin(ch|\.)?\b|\"/.test(s.toLowerCase());
  const hasMm = /\bmm\b/.test(s.toLowerCase());
  let num = null;
  if (frac) {
    const f = Number(frac[1]) / Number(frac[2]);
    const base = parseNumber(s);
    num = Number.isFinite(base) ? base + f : f;
  } else {
    num = parseNumber(s);
  }
  if (!Number.isFinite(num)) return '';
  if (hasIn && !hasMm) return String(Math.round(inchesToMm(num) * 100) / 100);
  return String(num);
}

function normalizePsi(val) { const n = parseNumber(val); return Number.isFinite(n) ? String(n) : ''; }
function normalizeMicron(val) { const n = parseNumber(val); return Number.isFinite(n) ? String(n) : ''; }
function normalizeGpm(val) { const n = parseNumber(val); return Number.isFinite(n) ? String(n) : ''; }
function normalizeCfm(val) { const n = parseNumber(val); return Number.isFinite(n) ? String(n) : ''; }
function normalizeGrams(val) { const n = parseNumber(val); return Number.isFinite(n) ? String(n) : ''; }

const FIELD_NORMALIZERS = {
  height_mm: normalizeDim,
  outer_diameter_mm: normalizeDim,
  inner_diameter_mm: normalizeDim,
  panel_width_mm: normalizeDim,
  panel_depth_mm: normalizeDim,
  gasket_od_mm: normalizeDim,
  gasket_id_mm: normalizeDim,
  thread_size: (v) => String(v || '').trim(),
  micron_rating: normalizeMicron,
  bypass_valve_psi: normalizePsi,
  hydrostatic_burst_psi: normalizePsi,
  operating_pressure_min_psi: normalizePsi,
  operating_pressure_max_psi: normalizePsi,
  rated_flow_gpm: normalizeGpm,
  rated_flow_cfm: normalizeCfm,
  dirt_capacity_grams: normalizeGrams,
  weight_grams: normalizeGrams,
  pleat_count: (v) => {
    const n = parseNumber(v); return Number.isFinite(n) ? String(Math.round(n)) : '';
  },
  water_separation_efficiency_percent: (v) => {
    const n = parseNumber(v); return Number.isFinite(n) ? String(Math.max(0, Math.min(100, n))) : '';
  }
};

async function run({ dryRun = true } = {}) {
  const doc = await initSheet();
  const sheet = await getOrCreateMarinosSheet(doc);
  await sheet.loadHeaderRow();
  const rows = await sheet.getRows();

  let changed = 0;
  for (const row of rows) {
    let touched = false;
    for (const [field, fn] of Object.entries(FIELD_NORMALIZERS)) {
      if (!(field in row)) continue;
      const before = row[field];
      const after = fn(before);
      if (String(after) !== String(before)) { row[field] = after; touched = true; }
    }
    if (touched) {
      changed++;
      if (!dryRun) await row.save();
    }
  }
  console.log(JSON.stringify({ ok: true, dryRun, rows_total: rows.length, rows_changed: changed }, null, 2));
}

(async () => {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  await run({ dryRun: !apply });
  if (!apply) console.log('Dry-run. Use --apply to persist changes.');
  process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });