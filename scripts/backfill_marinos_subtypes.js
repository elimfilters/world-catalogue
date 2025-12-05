#!/usr/bin/env node
// Backfill de 'subtype' (y opcionalmente 'type' y 'duty_type') en hoja 'Marinos'
// Reglas basadas en prefijos proporcionados:
// - ET9: Turbinas Racor/Parker -> subtype: 'Turbina'; type: 'Separador Agua/Combustible'
// - EM9: Filtros marinos (combustible/aceite/otros). Usa media_type para decidir subtype.
// - ER9: Exclusivo filtros RACOR/PARKER marinos -> subtype: 'Racor/Parker'; type según media_type.

const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); } catch (_) {}

const { initSheet, getOrCreateMarinosSheet } = require('../src/services/marineImportService');

function starts(normsku, prefix) {
  const s = String(normsku || '').toUpperCase().trim();
  return s.startsWith(prefix);
}

function getEm9Family(normsku) {
  const s = String(normsku || '').toUpperCase().trim();
  if (!s.startsWith('EM9')) return null;
  const m = s.match(/EM9-([A-Z])/);
  return m ? m[1] : null;
}

function decideSubtype({ normsku, media_type }) {
  const mt = String(media_type || '').toLowerCase();
  if (starts(normsku, 'ET9')) return 'Turbina';
  if (starts(normsku, 'ER9')) {
    if (mt.includes('aceite')) return 'filtro aceite';
    if (mt.includes('combustible') || mt.includes('diesel')) return 'filtro combustible';
    return 'Racor/Parker';
  }
  if (starts(normsku, 'EM9')) {
    const fam = getEm9Family(normsku);
    // EM9-S: separador
    if (fam === 'S') return 'Separador';
    // EM9-F u EM9-O: fallback Spin-on si no hay señal clara en media_type
    if ((fam === 'F' || fam === 'O')) {
      const hasSignal = !!mt;
      if (!hasSignal) return 'Spin-on';
    }
  }
  return '';
}

function decideType({ normsku, media_type, type }) {
  const t = String(type || '').trim();
  if (t) return t; // mantener si ya existe
  const mt = String(media_type || '').toLowerCase();
  if (starts(normsku, 'ET9')) return 'Separador Agua/Combustible';
  if (mt.includes('aceite')) return 'filtro aceite';
  if (mt.includes('aire')) return 'filtro aire';
  if (mt.includes('combustible') || mt.includes('diesel')) return 'filtro combustible';
  // Regla por prefijo EM9: por defecto 'filtro combustible' si no hay señal
  if (starts(normsku, 'EM9')) return 'filtro combustible';
  return '';
}

function decideDutyType({ duty_type, normsku, engine_applications_raw, equipment_applications_raw }) {
  const d = String(duty_type || '').trim();
  if (d) return d; // mantener si ya existe
  // Regla de prefijo (alta prioridad): ET9 y ER9 => HD
  if (starts(normsku, 'ET9') || starts(normsku, 'ER9')) return 'HD';

  const txt = [engine_applications_raw, equipment_applications_raw]
    .map(x => String(x || '').toLowerCase())
    .join(' ');
  // Expansión de palabras clave
  const hdWords = ['diesel','heavy duty',' hd','marine diesel','comercial','generador','inboard'];
  const ldWords = ['gasolina','pleasure craft',' ld','outboard','gasoline','nautic','yacht'];
  // Marcas/segmentos aprobados
  const hdBrands = ['volvo penta','cat','caterpillar','cummins','man','mtu','yanmar','scania','detroit diesel','perkins'];
  const ldBrands = ['mercury','yamaha','honda','suzuki','evinrude','sea-doo','seadoo','johnson','tohatsu'];
  const isHD = hdWords.some(w => txt.includes(w));
  const isLD = ldWords.some(w => txt.includes(w));
  const hasHdBrand = hdBrands.some(b => txt.includes(b));
  const hasLdBrand = ldBrands.some(b => txt.includes(b));
  const hdSignal = isHD || hasHdBrand;
  const ldSignal = isLD || hasLdBrand;
  if (hdSignal && !ldSignal) return 'HD';
  if (ldSignal && !hdSignal) return 'LD';
  // Si ambos aparecen o ninguno, mantener vacío para evitar suposiciones
  return '';
}

async function run({ dryRun = true } = {}) {
  const doc = await initSheet();
  const sheet = await getOrCreateMarinosSheet(doc);
  await sheet.loadHeaderRow();
  const rows = await sheet.getRows();

  let rowsTouched = 0;
  let subtypeFilled = 0;
  let typeFilled = 0;
  let dutyFilled = 0;

  for (const row of rows) {
    let changed = false;
    const currentSubtype = String(row.subtype || '').trim();
    const currentType = String(row.type || '').trim();
    const currentDuty = String(row.duty_type || '').trim();

    if (!currentSubtype) {
      const sub = decideSubtype({ normsku: row.normsku, media_type: row.media_type });
      if (sub) { row.subtype = sub; subtypeFilled++; changed = true; }
    }

    // Intentar rellenar 'type' si está vacío y hay información
    const nextType = decideType({ normsku: row.normsku, media_type: row.media_type, type: row.type });
    if (!currentType && nextType) { row.type = nextType; typeFilled++; changed = true; }

    // Intentar rellenar 'duty_type' si está vacío
    const nextDuty = decideDutyType({ duty_type: row.duty_type, normsku: row.normsku, engine_applications_raw: row.engine_applications_raw, equipment_applications_raw: row.equipment_applications_raw });
    if (!currentDuty && nextDuty) { row.duty_type = nextDuty; dutyFilled++; changed = true; }

    if (changed) {
      rowsTouched++;
      if (!dryRun) await row.save();
    }
  }

  console.log(JSON.stringify({ ok: true, dryRun, rows_total: rows.length, rows_touched: rowsTouched, subtype_filled: subtypeFilled, type_filled: typeFilled, duty_type_filled: dutyFilled }, null, 2));
}

(async () => {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  await run({ dryRun: !apply });
  if (!apply) console.log('Dry-run. Use --apply to persist changes.');
  process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });