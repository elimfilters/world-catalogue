try { require('dotenv').config(); } catch (_) {}
const { GoogleSpreadsheet } = require('google-spreadsheet');

const SHEET_ID = process.env.GOOGLE_SHEETS_ID || '1ZYI5c0enkuvWAveu8HMaCUk1cek_VDrX8GtgKW7VP6U';

async function init() {
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
  return doc;
}

(async () => {
  const doc = await init();
  const tabs = doc.sheetsByIndex.map(s => ({ index: s.index, title: s.title, rowCount: s.rowCount, columnCount: s.columnCount }));
  console.log(JSON.stringify({ ok: true, sheetId: SHEET_ID, tabs }, null, 2));
})().catch(err => { console.error(err); process.exit(1); });
