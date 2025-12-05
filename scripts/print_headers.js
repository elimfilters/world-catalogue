// Print Google Sheet Master header columns
try { require('dotenv').config(); } catch (_) {}

const { GoogleSpreadsheet } = require('google-spreadsheet');

async function main() {
  try {
    const SHEET_ID = process.env.GOOGLE_SHEETS_ID || '1ZYI5c0enkuvWAveu8HMaCUk1cek_VDrX8GtgKW7VP6U';
    const doc = new GoogleSpreadsheet(SHEET_ID);
    const credsRaw = process.env.GOOGLE_CREDENTIALS;
    if (credsRaw) {
      const creds = JSON.parse(credsRaw);
      if (creds.private_key) creds.private_key = creds.private_key.replace(/\\n/g, '\n');
      await doc.useServiceAccountAuth({ client_email: creds.client_email, private_key: creds.private_key });
    } else if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
      await doc.useServiceAccountAuth({ client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL, private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n') });
    } else {
      throw new Error('Missing Google Sheets credentials');
    }
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    await sheet.loadHeaderRow();
    console.log(JSON.stringify({ headers: sheet.headerValues }, null, 2));
  } catch (e) {
    console.error('Headers diagnostic failed:', e.message);
    process.exit(1);
  }
}

main();