const { GoogleSpreadsheet } = require('google-spreadsheet');

class GoogleSheetsService {
  constructor() {
    this.doc = null;
    this.sheet = null;
    this.isInitialized = false;
    this.SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
    this.SERVICE_ACCOUNT = null;
    
    try {
      const serviceAccountJson = process.env.GOOGLE_SHEETS_API_KEY;
      this.SERVICE_ACCOUNT = JSON.parse(serviceAccountJson);
    } catch (error) {
      console.error('[Sheets] Error parsing service account:', error.message);
    }
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      this.doc = new GoogleSpreadsheet(this.SPREADSHEET_ID);
      
      await this.doc.useServiceAccountAuth({
        client_email: this.SERVICE_ACCOUNT.client_email,
        private_key: this.SERVICE_ACCOUNT.private_key,
      });

      await this.doc.loadInfo();
      this.sheet = this.doc.sheetsByTitle['MASTER_UNIFIED_V5'];
      
      if (!this.sheet) {
        throw new Error('Sheet MASTER_UNIFIED_V5 not found');
      }

      this.isInitialized = true;
      console.log('[Sheets] API initialized');
    } catch (error) {
      console.error('[Sheets] Initialization error:', error.message);
      throw error;
    }
  }

  async searchFilterByCode(filterCode) {
    await this.initialize();
    
    try {
      console.log('[Sheets] Searching for:', filterCode);
      const rows = await this.sheet.getRows();
      
      for (let i = 0; i < rows.length; i++) {
        if (rows[i].get('filterCode') === filterCode) {
          console.log('[Sheets] Found in row', i + 1);
          return {
            filterCode: rows[i].get('filterCode'),
            elimfiltersSKU: rows[i].get('elimfiltersSKU'),
            description: rows[i].get('description'),
            filterType: rows[i].get('filterType'),
            elimfiltersPrefix: rows[i].get('elimfiltersPrefix'),
            duty: rows[i].get('duty')
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
      const row = {
        filterCode: filterCode,
        elimfiltersSKU: classificationResult.elimfiltersSKU || '',
        description: classificationResult.description || '',
        filterType: classificationResult.filterType || '',
        elimfiltersPrefix: classificationResult.elimfiltersPrefix || '',
        duty: classificationResult.duty || ''
      };

      await this.sheet.addRow(row);
      console.log('[Sheets] Filter saved');
      return true;
    } catch (error) {
      console.error('[Sheets] Save error:', error.message);
      return false;
    }
  }
}

module.exports = new GoogleSheetsService();
