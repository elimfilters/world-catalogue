const { google } = require('googleapis');

// Use the correct service account with spreadsheet access
const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  .replace(/-----BEGIN PRIVATE KEY-----/g, '-----BEGIN PRIVATE KEY-----\n')
  .replace(/-----END PRIVATE KEY-----/g, '\n-----END PRIVATE KEY-----')
  .replace(/(.{64})/g, '$1\n');

const credentials = {
  type: 'service_account',
  client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  private_key: privateKey
};

const auth = new google.auth.GoogleAuth({
  credentials: credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

class GoogleSheetsService {
  async searchInSheets(filterCode) {
    try {
      console.log('[Sheets] Searching for:', filterCode);
      
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'MASTER_UNIFIED_V5!A:Z'
      });

      const rows = result.data.values;
      if (!rows || rows.length === 0) {
        console.log('[Sheets] No data found');
        return null;
      }

      const headers = rows[0];
      const codeIndex = headers.findIndex(h => h && h.toLowerCase().includes('code'));
      
      if (codeIndex === -1) {
        console.log('[Sheets] Code column not found');
        return null;
      }

      const matchedRow = rows.find(row => {
        const cellValue = row[codeIndex];
        return cellValue && cellValue.toString().toUpperCase() === filterCode.toUpperCase();
      });

      if (matchedRow) {
        const filterData = {};
        headers.forEach((header, index) => {
          if (header && matchedRow[index]) {
            filterData[header] = matchedRow[index];
          }
        });
        
        console.log('[Sheets] Found:', filterData.SKU || filterCode);
        return filterData;
      }

      console.log('[Sheets] Not found in Google Sheets');
      return null;
    } catch (error) {
      console.error('[Sheets] Error:', error.message);
      throw error;
    }
  }
}

module.exports = new GoogleSheetsService();