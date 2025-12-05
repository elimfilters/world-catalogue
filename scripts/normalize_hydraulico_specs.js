// Normalización de especificaciones para la familia HIDRÁULICO en Hoja Maestra
// Flags: --dry-run (por defecto), --apply, --force-scan, --verbose
try { require('dotenv').config(); } catch (_) {}
const { GoogleSpreadsheet } = require('google-spreadsheet');

const SHEET_ID = process.env.GOOGLE_SHEETS_ID || '1ZYI5c0enkuvWAveu8HMaCUk1cek_VDrX8GtgKW7VP6U';

function toNumber(x) {
  if (x === null || x === undefined) return null;
  const s = String(x).trim();
  if (!s) return null;
  const n = parseFloat(s.replace(/,/g, '.'));
  return isNaN(n) ? null : n;
}

// Conversión unidades a PSI
function convertToPsi(value, unit) {
  const n = toNumber(value);
  if (n === null) return null;
  const u = String(unit || '').toLowerCase();
  if (u.includes('psi')) return n;
  if (u.includes('bar')) return n * 14.5038;
  if (u.includes('kpa')) return n * 0.145038;
  if (u.includes('mpa')) return n * 145.038;
  return null; // unidad desconocida
}

function parsePressureTextToPsi(text) {
  const t = String(text || '').toLowerCase();
  if (!t) return { min: null, max: null, single: null };
  // rangos: 10-20 bar / 1000-2000 kpa / 0.5-1.0 mpa
  const range = t.match(/([\d.,]+)\s*-\s*([\d.,]+)\s*(bar|kpa|mpa|psi)/);
  if (range) {
    const min = convertToPsi(range[1], range[3]);
    const max = convertToPsi(range[2], range[3]);
    return { min, max, single: null };
  }
  // formatos: hasta 1000 kpa, max 200 bar, 1500 psi
  const single = t.match(/(hasta|max|máx\.?|maximum|up to)?\s*([\d.,]+)\s*(bar|kpa|mpa|psi)/);
  if (single) {
    const val = convertToPsi(single[2], single[3]);
    return { min: null, max: val, single: val };
  }
  // números sueltos con unidad implícita (asumir psi si pone 'psi')
  const psiOnly = t.match(/([\d.,]+)\s*psi/);
  if (psiOnly) {
    const val = convertToPsi(psiOnly[1], 'psi');
    return { min: null, max: val, single: val };
  }
  return { min: null, max: null, single: null };
}

function parseBurstToPsi(text) {
  const t = String(text || '').toLowerCase();
  if (!t) return null;
  const m = t.match(/([\d.,]+)\s*(bar|kpa|mpa|psi)/);
  if (m) return convertToPsi(m[1], m[2]);
  const n = toNumber(t);
  return n; // si es número ya
}

function convertFlowToGpm(text) {
  const t = String(text || '').toLowerCase();
  if (!t) return null;
  // L/min a GPM
  const lpm = t.match(/([\d.,]+)\s*(l\/min|lpm)/);
  if (lpm) {
    const l = toNumber(lpm[1]);
    return l === null ? null : l * 0.264172;
  }
  // ya en gpm
  const gpm = t.match(/([\d.,]+)\s*gpm/);
  if (gpm) {
    const g = toNumber(gpm[1]);
    return g;
  }
  const n = toNumber(t);
  return n; // si es número simple, asumir gpm
}

function parseMicron(text) {
  const t = String(text || '').toLowerCase();
  const m = t.match(/([\d.,]+)\s*(µm|um|micron|microns)/);
  if (!m) return null;
  return toNumber(m[1]);
}

function parseBeta200(text) {
  const t = String(text || '').toLowerCase();
  const betaHit = /beta\s*200|β\s*200/.test(t);
  if (!betaHit) return null;
  return 200;
}

// Snippets para verbose
function findPressureSnippet(text) {
  const t = String(text || '');
  let m = t.match(/([\d.,]+\s*-\s*[\d.,]+\s*(bar|kpa|mpa|psi))/i);
  if (m) return m[0];
  m = t.match(/((hasta|max|máx\.?|maximum|up to)?\s*[\d.,]+\s*(bar|kpa|mpa|psi))/i);
  if (m) return m[0];
  m = t.match(/([\d.,]+\s*psi)/i);
  if (m) return m[0];
  return null;
}
function findBurstSnippet(text) {
  const t = String(text || '');
  const m = t.match(/([\d.,]+)\s*(bar|kpa|mpa|psi)/i);
  return m ? m[0] : null;
}
function findFlowSnippet(text) {
  const t = String(text || '');
  let m = t.match(/([\d.,]+)\s*(l\/min|lpm)/i);
  if (m) return m[0];
  m = t.match(/([\d.,]+)\s*gpm/i);
  if (m) return m[0];
  return null;
}
function findMicronSnippet(text) {
  const t = String(text || '');
  const m = t.match(/([\d.,]+)\s*(µm|um|micron|microns)/i);
  return m ? m[0] : null;
}
function findBetaSnippet(text) {
  const t = String(text || '');
  const m = t.match(/beta\s*200|β\s*200/i);
  return m ? m[0] : null;
}

function isHydraulicRow(row) {
  const type = String(row.type || '').toLowerCase();
  const media = String(row.media_type || '').toLowerCase();
  return type.includes('hidráulico') || type.includes('hidraulico') || media.includes('hidráulico') || media.includes('hydraulic') || media.includes('hidraulico');
}

async function initSheet() {
  const doc = new GoogleSpreadsheet(SHEET_ID);
  const credsRaw = process.env.GOOGLE_CREDENTIALS;
  if (credsRaw) {
    let creds;
    try { creds = JSON.parse(credsRaw); } catch (e) { throw new Error('Invalid GOOGLE_CREDENTIALS JSON'); }
    if (creds.private_key) creds.private_key = creds.private_key.replace(/\n/g, '\n');
    await doc.useServiceAccountAuth({ client_email: creds.client_email, private_key: creds.private_key });
  } else if ((process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL) && process.env.GOOGLE_PRIVATE_KEY) {
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\n/g, '\n');
    await doc.useServiceAccountAuth({ client_email: clientEmail, private_key: privateKey });
  } else {
    throw new Error('Missing Google Sheets credentials');
  }
  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[0];
  await sheet.loadHeaderRow();
  return { doc, sheet };
}

async function run({ dryRun = true, forceScan = false, verbose = false } = {}) {
  const { sheet } = await initSheet();
  const rows = await sheet.getRows();
  let rowsTouched = 0;
  let changes = {
    operating_pressure_min_psi: 0,
    operating_pressure_max_psi: 0,
    hydrostatic_burst_psi: 0,
    rated_flow_gpm: 0,
    micron_rating: 0,
    beta_200: 0,
    duty_type: 0
  };
  let verboseCount = 0;
  const verboseLimit = 50;

  for (const row of rows) {
    if (!forceScan && !isHydraulicRow(row)) continue;
    let changed = false;

    // Fuente agregada de texto crudo para extracción si columnas están vacías
    const aggregateText = [
      row.description,
      row.short_description,
      row.long_description,
      row.marketing_text,
      row.features,
      row.specs,
      row.equipment_applications,
      row.engine_applications,
      row.equipment_applications_raw,
      row.engine_applications_raw,
      row.brand
    ]
      .map(x => String(x || '').toLowerCase())
      .join(' ');

    // Presiones operativas (min/max) - aceptar texto con unidades y rangos
    const opMinRaw = row.operating_pressure_min_psi;
    const opMaxRaw = row.operating_pressure_max_psi;
    const opMinSource = opMinRaw ? 'operating_pressure_min_psi' : 'aggregate';
    const opMaxSource = opMaxRaw ? 'operating_pressure_max_psi' : 'aggregate';
    const opMinParsed = parsePressureTextToPsi(opMinRaw || aggregateText);
    const opMaxParsed = parsePressureTextToPsi(opMaxRaw || aggregateText);

    if (opMinParsed.min !== null || opMinParsed.single !== null) {
      const prev = toNumber(row.operating_pressure_min_psi);
      const next = opMinParsed.min !== null ? opMinParsed.min : opMinParsed.single;
      if (next !== null && (prev === null || Math.abs(prev - next) > 0.0001)) {
        row.operating_pressure_min_psi = next;
        changes.operating_pressure_min_psi++;
        changed = true;
      }
    }
    if (opMinParsed.max !== null) {
      const prev = toNumber(row.operating_pressure_max_psi);
      const next = opMinParsed.max;
      if (next !== null && (prev === null || Math.abs(prev - next) > 0.0001)) {
        row.operating_pressure_max_psi = next;
        changes.operating_pressure_max_psi++;
        changed = true;
      }
    }

    if (opMaxParsed.min !== null) {
      const prev = toNumber(row.operating_pressure_min_psi);
      const next = opMaxParsed.min;
      if (next !== null && (prev === null || Math.abs(prev - next) > 0.0001)) {
        row.operating_pressure_min_psi = next;
        changes.operating_pressure_min_psi++;
        changed = true;
      }
    }
    if (opMaxParsed.max !== null || opMaxParsed.single !== null) {
      const prev = toNumber(row.operating_pressure_max_psi);
      const next = opMaxParsed.max !== null ? opMaxParsed.max : opMaxParsed.single;
      if (next !== null && (prev === null || Math.abs(prev - next) > 0.0001)) {
        row.operating_pressure_max_psi = next;
        changes.operating_pressure_max_psi++;
        changed = true;
      }
    }

    // Burst (hidrostático)
    const burstRaw = row.hydrostatic_burst_psi;
    const burstSource = burstRaw ? 'hydrostatic_burst_psi' : 'aggregate';
    const burstNext = burstRaw ? parseBurstToPsi(burstRaw) : parseBurstToPsi(aggregateText);
    if (burstNext !== null) {
      const prev = toNumber(row.hydrostatic_burst_psi);
      if (prev === null || Math.abs(prev - burstNext) > 0.0001) {
        row.hydrostatic_burst_psi = burstNext;
        changes.hydrostatic_burst_psi++;
        changed = true;
      }
    }

    // Flujo
    const flowRaw = row.rated_flow_gpm;
    const flowSource = flowRaw ? 'rated_flow_gpm' : 'aggregate';
    const flowNext = flowRaw ? convertFlowToGpm(flowRaw) : convertFlowToGpm(aggregateText);
    if (flowNext !== null) {
      const prev = toNumber(row.rated_flow_gpm);
      if (prev === null || Math.abs(prev - flowNext) > 0.0001) {
        row.rated_flow_gpm = flowNext;
        changes.rated_flow_gpm++;
        changed = true;
      }
    }

    // Micron y Beta 200
    const micronRaw = row.micron_rating || aggregateText;
    const betaRaw = row.beta_200 || aggregateText;
    const micronSource = row.micron_rating ? 'micron_rating' : 'aggregate';
    const betaSource = row.beta_200 ? 'beta_200' : 'aggregate';
    const micronNext = parseMicron(micronRaw);
    const betaNext = parseBeta200(betaRaw || micronRaw || '');
    if (micronNext !== null) {
      const prev = toNumber(row.micron_rating);
      if (prev === null || Math.abs(prev - micronNext) > 0.0001) {
        row.micron_rating = micronNext;
        changes.micron_rating++;
        changed = true;
      }
    }
    if (betaNext !== null) {
      const prev = toNumber(row.beta_200);
      if (prev === null || Math.abs(prev - betaNext) > 0.0001) {
        row.beta_200 = betaNext;
        changes.beta_200++;
        changed = true;
      }
    }

    // Inferencia duty_type por marcas industriales si está vacío
    const dutyCurrent = String(row.duty_type || '').trim();
    if (!dutyCurrent) {
      const hdBrands = [
        'parker hannifin',
        'eaton',
        'vickers',
        'cat',
        'caterpillar',
        'komatsu',
        'bosch rexroth',
        'rexroth',
        'hydac',
        'donaldson hydraulics'
      ];
      const hasHdBrand = hdBrands.some(b => aggregateText.includes(b));
      if (hasHdBrand) {
        row.duty_type = 'HD';
        changes.duty_type++;
        changed = true;
      }
    }

    if (verbose && verboseCount < verboseLimit) {
      const pressureSnippet = findPressureSnippet(opMinRaw || opMaxRaw || aggregateText);
      const burstSnippet = findBurstSnippet(burstRaw || aggregateText);
      const flowSnippet = findFlowSnippet(flowRaw || aggregateText);
      const micronSnippet = findMicronSnippet(micronRaw);
      const betaSnippet = findBetaSnippet(betaRaw);
      if (pressureSnippet || burstSnippet || flowSnippet || micronSnippet || betaSnippet) {
        console.log(JSON.stringify({
          verbose: true,
          sku: row.sku || row.code || row.product_code || null,
          brand: row.brand || null,
          type: row.type || null,
          sources: {
            pressure: { source_min: opMinSource, source_max: opMaxSource, snippet: pressureSnippet },
            burst: { source: burstSource, snippet: burstSnippet },
            flow: { source: flowSource, snippet: flowSnippet },
            micron: { source: micronSource, snippet: micronSnippet },
            beta: { source: betaSource, snippet: betaSnippet }
          }
        }));
        verboseCount++;
      }
    }

    if (changed) {
      rowsTouched++;
      if (!dryRun) await row.save();
    }
  }

  console.log(JSON.stringify({ ok: true, dryRun, forceScan, verbose, rows_total: rows.length, rows_touched: rowsTouched, changes }, null, 2));
}

(async () => {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const forceScan = args.includes('--force-scan');
  const verbose = args.includes('--verbose');
  await run({ dryRun: !apply, forceScan, verbose });
  if (!apply) console.log('Dry-run. Use --apply to persist changes.');
  process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });
