require('dotenv').config();
const { google } = require('googleapis');

// Configurar autenticacion usando variable de entorno
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

/**
 * Escribir datos en Google Sheets
 */
async function writeToSheet(data, range = 'Sheet1!A1') {
  try {
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: range,
      valueInputOption: 'RAW',
      resource: {
        values: data,
      },
    });
    console.log(response.data.updatedCells + ' celdas actualizadas');
    return response.data;
  } catch (error) {
    console.error('Error escribiendo en Google Sheets:', error.message);
    throw error;
  }
}

/**
 * Agregar datos al final de la hoja
 */
async function appendToSheet(data, range = 'Sheet1!A:D') {
  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: range,
      valueInputOption: 'RAW',
      resource: {
        values: data,
      },
    });
    console.log(response.data.updates.updatedCells + ' celdas agregadas');
    return response.data;
  } catch (error) {
    console.error('Error agregando a Google Sheets:', error.message);
    throw error;
  }
}

/**
 * Leer datos de Google Sheets
 */
async function readFromSheet(range = 'Sheet1!A1:D10') {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: range,
    });
    const rows = response.data.values;
    console.log((rows ? rows.length : 0) + ' filas leidas');
    return rows;
  } catch (error) {
    console.error('Error leyendo Google Sheets:', error.message);
    throw error;
  }
}

module.exports = {
  writeToSheet,
  appendToSheet,
  readFromSheet,
};