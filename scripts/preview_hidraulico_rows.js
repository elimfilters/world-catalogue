// Preview de filas HIDRÁULICO para calibración de regex
try { require('dotenv').config(); } catch (_) {}
const { GoogleSpreadsheet } = require('google-spreadsheet');

const SHEET_ID = process.env.GOOGLE_SHEETS_ID || '1ZYI5c0enkuvWAveu8HMaCUk1cek_VDrX8GtgKW7VP6U';

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

(async () => {
  const { sheet } = await initSheet();
  const rows = await sheet.getRows();
  const hydros = rows.filter(isHydraulicRow).slice(0, 2);
  const out = hydros.map((row, idx) => ({
    index: idx,
    sku: row.sku || row.code || row.product_code || null,
    brand: row.brand || null,
    type: row.type || null,
    media_type: row.media_type || null,
    description: row.description || null,
    equipment_applications_raw: row.equipment_applications_raw || null,
    equipment_applications: row.equipment_applications || null,
    engine_applications_raw: row.engine_applications_raw || null,
    engine_applications: row.engine_applications || null,
    marketing_text: row.marketing_text || null,
    operating_pressure_min_psi: row.operating_pressure_min_psi || null,
    operating_pressure_max_psi: row.operating_pressure_max_psi || null,
    hydrostatic_burst_psi: row.hydrostatic_burst_psi || null,
    rated_flow_gpm: row.rated_flow_gpm || null
  }));
  console.log(JSON.stringify({ ok: true, count: out.length, preview: out }, null, 2));
})().catch(err => { console.error(err); process.exit(1); });
