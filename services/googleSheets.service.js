const { google } = require('googleapis');

class GoogleSheetsService {
  constructor() {
    this.SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || '1ZYI5c0enkuvWAveu8HMaCUk1cek_VDrX8GtgKW7VP6U';
    this.auth = null;
    this.sheets = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      const credentials = {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      };

      if (!credentials.client_email || !credentials.private_key) {
        throw new Error('Credenciales de Google Sheets no configuradas');
      }

      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      this.initialized = true;
      console.log('[Sheets] API initialized');
    } catch (error) {
      console.error('[Sheets] Init error:', error.message);
      throw error;
    }
  }

  async searchFilterByCode(filterCode) {
    await this.initialize();
    
    try {
      console.log('[Sheets] Searching for:', filterCode);
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.SPREADSHEET_ID,
        range: 'MASTER_UNIFIED_V5!A:C'
      });

      const rows = response.data.values || [];
      
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === filterCode) {
          console.log('[Sheets] Found in row', i + 1);
          return {
            filterCode: rows[i][0],
            elimfiltersSKU: rows[i][1],
            description: rows[i][2]
          };
        }
      }

      console.log('[Sheets] Not found');
      return null;
    } catch (error) {
      console.error('[Sheets] Search error:', error.message);
      return null;
    }
  }

  async saveFilter(filterCode, classificationResult) {
    await this.initialize();
    
    try {
      const row = [
        filterCode,
        classificationResult.elimfiltersSKU || '',
        classificationResult.description || '',
        classificationResult.filterType || '',
        classificationResult.elimfiltersPrefix || '',
        classificationResult.duty || ''
      ];

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.SPREADSHEET_ID,
        range: 'MASTER_UNIFIED_V5!A:F',
        valueInputOption: 'USER_ENTERED',
        resource: { values: [row] }
      });

      console.log('[Sheets] Filter saved');
      return true;
    } catch (error) {
      console.error('[Sheets] Save error:', error.message);
      return false;
    }
  }
}

module.exports = new GoogleSheetsService();
