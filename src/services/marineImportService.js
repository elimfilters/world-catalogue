const { GoogleSpreadsheet } = require('google-spreadsheet');
const prefixMap = require('../config/prefixMap');
const { scraperBridge } = require('../scrapers/scraperBridge');
const { generateSKU, generateEM9SubtypeSKU, generateEM9SSeparatorSKU, generateET9SystemSKU, generateET9FElementSKU } = require('../sku/generator');
const { getMedia } = require('../utils/mediaMapper');
const { searchInSheet, buildRowData } = require('./syncSheetsService');
const { extractParkerSpecs, extractMercurySpecs, extractSierraSpecs } = require('./technicalSpecsScraper');

const SHEET_ID = process.env.GOOGLE_SHEETS_ID || '1ZYI5c0enkuvWAveu8HMaCUk1cek_VDrX8GtgKW7VP6U';
const MARINOS_TITLE = 'Marinos';

function toArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  const s = String(value || '')
    .split(/[,;\n\t/]+/)
    .map(x => x.trim())
    .filter(Boolean);
  return Array.from(new Set(s));
}

async function initSheet() {
  const doc = new GoogleSpreadsheet(SHEET_ID);
  const credsRaw = process.env.GOOGLE_CREDENTIALS;
  if (credsRaw) {
    let creds = JSON.parse(credsRaw);
    if (creds.private_key) creds.private_key = creds.private_key.replace(/\\n/g, '\n');
    await doc.useServiceAccountAuth({ client_email: creds.client_email, private_key: creds.private_key });
  } else if ((process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL) && process.env.GOOGLE_PRIVATE_KEY) {
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
    await doc.useServiceAccountAuth({ client_email: clientEmail, private_key: privateKey });
  } else {
    throw new Error('Missing Google Sheets credentials');
  }
  await doc.loadInfo();
  return doc;
}

// Esquema de encabezados para la pestaña 'Marinos' ajustado a la lista solicitada
const INPUT_HEADERS = [
  'query',
  'normsku',
  'duty_type',
  'type',
  'subtype',
  'description',
  'media_type',
  'oem_codes_raw',
  'cross_reference_raw',
  'engine_applications_raw',
  'equipment_applications_raw',
  'height_mm',
  'outer_diameter_mm',
  'thread_size',
  'micron_rating',
  'operating_temperature_min_c',
  'operating_temperature_max_c',
  'fluid_compatibility',
  'disposal_method',
  'gasket_od_mm',
  'gasket_id_mm',
  'bypass_valve_psi',
  'beta_200',
  'hydrostatic_burst_psi',
  'dirt_capacity_grams',
  'rated_flow_gpm',
  'rated_flow_cfm',
  'operating_pressure_min_psi',
  'operating_pressure_max_psi',
  'weight_grams',
  'panel_width_mm',
  'panel_depth_mm',
  'water_separation_efficiency_percent',
  'drain_type',
  'inner_diameter_mm',
  'pleat_count',
  'seal_material',
  'housing_material',
  'iso_main_efficiency_percent',
  'iso_test_method',
  'manufacturing_standards',
  'certification_standards',
  'service_life_hours',
  'change_interval_km'
];

async function getOrCreateMarinosSheet(doc) {
  let sheet = doc.sheetsByTitle[MARINOS_TITLE] || null;
  if (!sheet) {
    sheet = await doc.addSheet({ title: MARINOS_TITLE, headerValues: INPUT_HEADERS });
  } else {
    // Ensure headers (non-destructive)
    try {
      const cur = Array.isArray(sheet.headerValues) ? sheet.headerValues : [];
      const need = INPUT_HEADERS;
      if (cur.length !== need.length || cur.some((h, i) => h !== need[i])) {
        await sheet.setHeaderRow(need);
      }
    } catch (_) {}
  }
  return sheet;
}

async function seedMarinosRow(code, doc) {
  const sheet = await getOrCreateMarinosSheet(doc);
  await sheet.addRow({
    query: prefixMap.normalize(code),
    normsku: '',
    duty_type: '',
    type: '',
    subtype: '',
    description: '',
    media_type: '',
    oem_codes_raw: code,
    cross_reference_raw: '',
    engine_applications_raw: '',
    equipment_applications_raw: ''
  });
  return true;
}

function decideSkuAndFamily(codeRaw, duty, familyHint) {
  const up = String(codeRaw || '').toUpperCase();
  let family = familyHint || null;
  let sku = null;
  if (/^R(12|15|20|25|45|60|90|120)(T|S)$/.test(up)) {
    sku = generateEM9SSeparatorSKU(up);
    family = 'MARINE';
    return { sku, family };
  }
  if (/^\d{3,5}(MA|FH)\b/.test(up)) {
    sku = generateET9SystemSKU(up);
    family = 'TURBINE SERIES';
    return { sku, family };
  }
  if (/^(2010|2020|2040)/.test(up)) {
    sku = generateET9FElementSKU(up);
    family = 'TURBINE SERIES';
    return { sku, family };
  }
  if (String(family).toUpperCase() === 'MARINE') {
    const base = 'FUEL';
    // Usar extracción alfanumérica para coherencia con el generador EM9-F/O/A
    const { extract4Alnum } = require('../utils/digitExtractor');
    sku = generateEM9SubtypeSKU(base, extract4Alnum(up));
    return { sku, family: 'MARINE' };
  }
  // Fallback generic
  sku = generateSKU(family || 'FUEL', duty || 'HD', require('../utils/digitExtractor').extract4Digits(up));
  return { sku, family: family || 'FUEL' };
}

async function importMarinos({ dryRun = true } = {}) {
  const doc = await initSheet();
  const sheet = await getOrCreateMarinosSheet(doc);
  const rows = await sheet.getRows();
  const results = [];
  // Umbral mínimo para considerar una lista "rica" y permitir sobrescritura
  const MIN_APP_THRESHOLD = 6;

  for (const row of rows) {
    const code = String(row.query || '').trim();
    if (!code) continue;
    // Normaliza y persiste 'query' si difiere
    const queryNorm = prefixMap.normalize(code);
    if (row.query !== queryNorm) row.query = queryNorm;
    const hint = prefixMap.resolveBrandFamilyDutyByPrefix(code) || {};
    const duty = row.duty_type || hint.duty || 'HD';
    const familyHint = row.type || hint.family || null;

    let scraper = await scraperBridge(code, duty);
    // If scraper did not classify family, use hint
    const family = (scraper && scraper.family) || familyHint || 'MARINE';
    const { sku, family: famFinal } = decideSkuAndFamily(code, duty, family);
    const media_type = getMedia(famFinal, duty);

    const oemA = toArray(row.oem_codes_raw);
    const crossA = toArray(row.cross_reference_raw);
    const enginesRaw = toArray(row.engine_applications_raw);
    const equipmentsRaw = toArray(row.equipment_applications_raw);

    const oem_codes = Array.from(new Set([code, ...oemA]));
    const cross_reference = Array.from(new Set([...(scraper?.cross || []), ...crossA]));

  const existing = await searchInSheet(sku);
  const isDuplicate = !!existing;

  row.normsku = sku;
  row.media_type = media_type;
  row.duty_type = duty;
  row.type = famFinal;
  row.subtype = /^R(12|15|20|25|45|60|90|120)(T|S)$/i.test(code) ? 'SEPARATOR' : (/^\d{3,5}(MA|FH)\b/.test(code) ? 'SYSTEM' : (/^(2010|2020|2040)/.test(code) ? 'ELEMENT' : ''));
    // ===== Enriquecimiento técnico MARINE (micron/flow/apps/cross) =====
    try {
      const sourceUp = String(scraper?.source || '').toUpperCase();
      let specs = null;
      if (sourceUp === 'PARKER') {
        specs = await extractParkerSpecs(code);
      } else if (sourceUp === 'MERCRUISER') {
        specs = await extractMercurySpecs(code);
      } else if (sourceUp === 'SIERRA') {
        specs = await extractSierraSpecs(code);
      }

      if (specs) {
        const perf = specs.performance || {};
        const tech = specs.technical_details || {};
        // Micron rating
        if (perf.micron_rating && String(row.micron_rating || '').trim() !== String(perf.micron_rating)) {
          row.micron_rating = String(perf.micron_rating);
        }
        // Compute rated_flow_gpm from available units
        const toGpm = (p) => {
          if (!p) return '';
          if (p.flow_gph) { const n = Number(p.flow_gph); return isFinite(n) && n > 0 ? (n/60).toFixed(2) : ''; }
          if (p.flow_lph) { const n = Number(p.flow_lph); return isFinite(n) && n > 0 ? (n/3.785411784/60).toFixed(2) : ''; }
          if (p.flow_lpm) { const n = Number(p.flow_lpm); return isFinite(n) && n > 0 ? (n/3.785411784).toFixed(2) : ''; }
          return '';
        };
        const gpm = toGpm(perf);
        if (gpm && String(row.rated_flow_gpm || '').trim() !== String(gpm)) {
          row.rated_flow_gpm = String(gpm);
        }
        // Fluid compatibility (fill if empty)
        if (tech.fluid_compatibility && !String(row.fluid_compatibility || '').trim()) {
          row.fluid_compatibility = String(tech.fluid_compatibility);
        }
        // Applications into *_raw columns
        const names = (arr) => {
          const a = Array.isArray(arr) ? arr : [];
          return a.map(x => (typeof x === 'string' ? x : (x?.name || ''))).map(s => s.trim()).filter(Boolean);
        };
        const enginesScraped = names(specs.engine_applications);
        const equipmentsScraped = names(specs.equipment_applications);

        if (sourceUp === 'PARKER' || sourceUp === 'SIERRA') {
          // Consolidación con guardrail de volumen: no reemplazar lista rica por una pobre
          const enginesMergedList = (
            enginesScraped.length >= MIN_APP_THRESHOLD
              ? enginesScraped
              : (enginesRaw.length >= MIN_APP_THRESHOLD
                  ? Array.from(new Set([ ...enginesRaw, ...enginesScraped ]))
                  : enginesScraped)
          );
          const enginesNext = enginesMergedList.join(', ');
          if (enginesNext !== (row.engine_applications_raw || '').trim()) {
            row.engine_applications_raw = enginesNext;
          }

          const equipmentsMergedList = (
            equipmentsScraped.length >= MIN_APP_THRESHOLD
              ? equipmentsScraped
              : (equipmentsRaw.length >= MIN_APP_THRESHOLD
                  ? Array.from(new Set([ ...equipmentsRaw, ...equipmentsScraped ]))
                  : (equipmentsScraped.length ? equipmentsScraped : equipmentsRaw))
          );
          const equipmentsNext = equipmentsMergedList.join(', ');
          if (equipmentsNext !== (row.equipment_applications_raw || '').trim()) {
            row.equipment_applications_raw = equipmentsNext;
          }
        } else {
          // Default accumulate behavior for other sources
          const enginesNext = Array.from(new Set([ ...enginesRaw, ...enginesScraped ])).join(', ');
          const equipmentsNext = Array.from(new Set([ ...equipmentsRaw, ...equipmentsScraped ])).join(', ');
          if (enginesNext && enginesNext !== (row.engine_applications_raw || '').trim()) {
            row.engine_applications_raw = enginesNext;
          }
          if (equipmentsNext && equipmentsNext !== (row.equipment_applications_raw || '').trim()) {
            row.equipment_applications_raw = equipmentsNext;
          }
        }
        // OEM & Cross raw consolidation
        const oemNext = Array.from(new Set([ ...oem_codes, ...(specs.oem_codes || []) ])).join(', ');
        if (oemNext && oemNext !== (row.oem_codes_raw || '').trim()) {
          row.oem_codes_raw = oemNext;
        }
        if (sourceUp === 'PARKER' || sourceUp === 'SIERRA') {
          // Overwrite cross references for PARKER/SIERRA using cleaned scraper output
          const crossClean = (specs.cross_reference || []).map(s => (typeof s === 'string' ? s : String(s))).map(s => s.trim()).filter(Boolean);
          const crossNext = crossClean.join(', ');
          // Escribir incluso si vacío para limpiar ruido histórico
          if (crossNext !== (row.cross_reference_raw || '').trim()) {
            row.cross_reference_raw = crossNext;
          }
        } else {
          const crossNext = Array.from(new Set([ ...cross_reference, ...(specs.cross_reference || []) ])).join(', ');
          if (crossNext && crossNext !== (row.cross_reference_raw || '').trim()) {
            row.cross_reference_raw = crossNext;
          }
        }
      }
    } catch (enrichErr) {
      // No bloquear importación por fallo de enriquecimiento
    }

    // Solo persistimos campos con valor; los crudos ya están en la hoja
    await row.save();

    // Nota: No escribir en Hoja Master desde el importador de Marinos.
    // Todas las operaciones quedan limitadas a la pestaña 'Marinos'.

    results.push({ code, sku, media_type, duty, family: famFinal, duplicate: isDuplicate });
  }

  return { ok: true, processed: results.length, results };
}

module.exports = { importMarinos, initSheet, getOrCreateMarinosSheet, seedMarinosRow, INPUT_HEADERS };

/**
 * Upsert a detected Marine SKU into the 'Marinos' sheet (not Master).
 * Maps detection payload into Marinos output columns.
 * @param {object} data - detection masterData payload
 * @returns {Promise<void>}
 */
async function upsertMarinosBySku(data) {
  const doc = await initSheet();
  const sheet = await getOrCreateMarinosSheet(doc);
  const rows = await sheet.getRows();

  const skuNorm = String(data.sku || '').toUpperCase().trim();
  const match = rows.find(r => String(r.normsku || '').toUpperCase().trim() === skuNorm);

  // Build base row using Master mapping (ensures formatting/normalizations)
  const base = buildRowData({ ...data });
  // Helper to format list-like values into comma-separated string
  const formatList = (list) => {
    const arr = Array.isArray(list) ? list : (list ? [list] : []);
    return Array.from(new Set(arr.map(v => typeof v === 'string' ? v : (v?.toString?.() || '')).map(s => s.trim()).filter(Boolean))).join(', ');
  };

  // Helper: excluir campos vacíos y no definidos
  const pruneEmpty = (obj) => {
    const allowed = new Set(INPUT_HEADERS);
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (!allowed.has(k)) continue;
      if (v === null || v === undefined) continue;
      if (typeof v === 'string' && v.trim() === '') continue;
      if (Array.isArray(v) && v.length === 0) continue;
      out[k] = v;
    }
    return out;
  };

  const rowData = {
    // Base normalized fields
    ...base,
    query: data.query_normalized || prefixMap.normalize(data.code_input || data.code_oem || ''),
    normsku: skuNorm,
    // Raw inputs
    oem_codes_raw: formatList(data.oem_codes),
    cross_reference_raw: formatList(data.cross_reference),
    engine_applications_raw: formatList((data.applications || []).map(a => a?.name || a)),
    equipment_applications_raw: formatList((data.equipment_applications || []).map(a => a?.name || a)),
    // Campos operacionales removidos del esquema
  };

  const clean = pruneEmpty(rowData);

  if (match) {
    Object.entries(clean).forEach(([k, v]) => { match[k] = v; });
    await match.save();
    console.log(`✅ Upserted to Google Sheet 'Marinos': ${skuNorm}`);
  } else {
    await sheet.addRow(clean);
    console.log(`➕ Inserted into Google Sheet 'Marinos': ${skuNorm}`);
  }
}

module.exports.upsertMarinosBySku = upsertMarinosBySku;