// Búsqueda de filas con textos de especificaciones para calibración
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
  const sheet = doc.sheetsByIndex[0];
  await sheet.loadHeaderRow();
  return { doc, sheet };
}

function hasSpecText(s) {
  const t = String(s || '').toLowerCase();
  return /\b(psi|bar|mpa|kpa|gpm|l\/min|beta\s*\d+|micron|µm|um)\b/.test(t);
}

(async () => {
  const { sheet } = await initSheet();
  const rows = await sheet.getRows();
  const hits = [];
  for (const r of rows) {
    const fields = [r.description, r.equipment_applications, r.engine_applications, r.brand];
    const match = fields.some(hasSpecText);
    if (match) {
      hits.push({
        sku: r.sku || r.code || r.product_code || null,
        brand: r.brand || null,
        type: r.type || null,
        description: r.description || null,
        equipment_applications: r.equipment_applications || null,
        engine_applications: r.engine_applications || null
      });
      if (hits.length >= 10) break;
    }
  }
  console.log(JSON.stringify({ ok: true, count: hits.length, samples: hits }, null, 2));
})().catch(err => { console.error(err); process.exit(1); });
