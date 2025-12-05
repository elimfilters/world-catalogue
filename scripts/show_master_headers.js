#!/usr/bin/env node
require('dotenv').config();

const { GoogleSpreadsheet } = require('google-spreadsheet');

async function main() {
  try {
    const SHEET_ID = process.env.GOOGLE_SHEETS_ID || '1ZYI5c0enkuvWAveu8HMaCUk1cek_VDrX8GtgKW7VP6U';

    let clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    let privateKey = process.env.GOOGLE_PRIVATE_KEY;
    if (process.env.GOOGLE_CREDENTIALS) {
      try {
        const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS);
        clientEmail = creds.client_email || clientEmail;
        privateKey = creds.private_key || privateKey;
      } catch (e) {
        console.warn('Advertencia: GOOGLE_CREDENTIALS no es JSON válido, usando variables separadas.');
      }
    }

    if (!clientEmail || !privateKey) {
      throw new Error('Faltan credenciales de Google: configure GOOGLE_SERVICE_ACCOUNT_EMAIL y GOOGLE_PRIVATE_KEY o GOOGLE_CREDENTIALS');
    }

    privateKey = privateKey.replace(/\\n/g, '\n');

    const doc = new GoogleSpreadsheet(SHEET_ID);
    await doc.useServiceAccountAuth({ client_email: clientEmail, private_key: privateKey });
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];

    console.log('Hoja:', sheet.title, 'ID:', SHEET_ID);
    console.log('Encabezados:', sheet.headerValues);
  } catch (err) {
    console.error('Error mostrando headers de la Hoja Maestra:', err.message);
    process.exit(1);
  }
}

main();