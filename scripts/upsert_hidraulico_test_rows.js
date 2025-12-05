// Upsert de filas de prueba HIDRÁULICO para calibración del parser
try { require('dotenv').config(); } catch (_) {}
const { GoogleSpreadsheet } = require('google-spreadsheet');

const SHEET_ID = process.env.GOOGLE_SHEETS_ID || '1ZYI5c0enkuvWAveu8HMaCUk1cek_VDrX8GtgKW7VP6U';

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
  const sheet = doc.sheetsByIndex[0]; // Master
  await sheet.loadHeaderRow();
  return { doc, sheet };
}

function filterPayloadByHeaders(payload, headers) {
  const out = {};
  Object.keys(payload).forEach(k => { if (headers.includes(k)) out[k] = payload[k]; });
  return out;
}

async function upsertRows(sheet, items) {
  const headers = sheet.headerValues;
  const idKeys = ['sku', 'code', 'product_code'].filter(k => headers.includes(k));
  const rows = await sheet.getRows();
  const indexByKey = {};
  idKeys.forEach(k => { indexByKey[k] = new Map(); });
  for (const r of rows) {
    idKeys.forEach(k => { const v = (r[k] || '').toString().trim(); if (v) indexByKey[k].set(v, r); });
  }

  const results = [];
  for (const item of items) {
    const code = item.code;
    let existing = null;
    for (const k of idKeys) {
      if (indexByKey[k].has(code)) { existing = indexByKey[k].get(code); break; }
    }
    const payloadBase = {
      sku: code,
      code: code,
      product_code: code,
      brand: item.brand,
      type: 'HIDRÁULICO',
      media_type: 'hydraulic',
      description: item.description,
      short_description: item.short_description,
      long_description: item.long_description,
      marketing_text: item.marketing_text,
      features: item.features,
      specs: item.specs,
      duty_type: '',
      rated_flow_gpm: '',
      operating_pressure_min_psi: '',
      operating_pressure_max_psi: '',
      hydrostatic_burst_psi: '',
      micron_rating: '',
      beta_200: ''
    };
    // Prefijo de familia si existe
    if (headers.includes('prefix')) payloadBase.prefix = item.family_prefix;
    if (headers.includes('family_prefix')) payloadBase.family_prefix = item.family_prefix;

    const payload = filterPayloadByHeaders(payloadBase, headers);
    if (existing) {
      Object.keys(payload).forEach(k => { existing[k] = payload[k]; });
      await existing.save();
      results.push({ code, action: 'updated' });
    } else {
      await sheet.addRow(payload);
      results.push({ code, action: 'inserted' });
    }
  }
  return results;
}

(async () => {
  const { sheet } = await initSheet();
  const items = [
    {
      brand: 'HYDAC',
      code: '0160R010BN4',
      family_prefix: 'EH6',
      description: 'Elemento HYDAC Betamicron R 0160R010BN4: β200 a 10 µm, presión de trabajo hasta 210 bar, presión de rotura 280 bar, caudal nominal 60 L/min (15.85 gpm).',
      short_description: 'HYDAC 0160R010BN4 10 µm β200',
      long_description: 'Elemento de filtración hidráulica para alta presión y caudal nominal',
      marketing_text: 'Elemento HYDAC Betamicron R 0160R010BN4: β200 a 10 µm, presión de trabajo hasta 210 bar, presión de rotura 280 bar, caudal nominal 60 L/min (15.85 gpm).',
      features: 'Filtración 10 micron; Beta 200; Heavy Duty; Industrial',
      specs: 'Pressure 210 bar; Burst 280 bar; Flow 60 L/min; Micron 10; Beta 200'
    },
    {
      brand: 'Parker Hannifin',
      code: '932628Q',
      family_prefix: 'EH6',
      description: 'Parker 932628Q elemento hidráulico: presión máxima 3000 psi, flujo 20 gpm, eficiencia 10 µm (Beta 200).',
      short_description: 'Parker 932628Q 10 µm β200',
      long_description: 'Filtro hidráulico industrial para sistemas de alta presión',
      marketing_text: 'Parker 932628Q elemento hidráulico: presión máxima 3000 psi, flujo 20 gpm, eficiencia 10 µm (Beta 200).',
      features: '10 micron; Beta 200; Heavy Duty',
      specs: 'Max pressure 3000 psi; Flow 20 gpm; Micron 10; Beta 200'
    }
  ];

  const res = await upsertRows(sheet, items);
  console.log(JSON.stringify({ ok: true, results: res }, null, 2));
})().catch(err => { console.error(err); process.exit(1); });