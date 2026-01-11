const { google } = require('googleapis');

class SheetsService {
  constructor() {
    this.auth = null;
    this.sheets = null;
  }

  async initialize() {
    try {
      const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (!email || !privateKey) {
        throw new Error('Missing Google credentials');
      }

      this.auth = new google.auth.JWT(
        email,
        null,
        privateKey,
        ['https://www.googleapis.com/auth/spreadsheets']
      );

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      console.log('✅ Google Sheets Service initialized');
    } catch (error) {
      console.error('❌ Error initializing Sheets:', error.message);
      throw error;
    }
  }

  async appendRow(data) {
    const sheetId = process.env.GOOGLE_SHEET_ID;
    
    const row = [
      new Date().toISOString(),
      data.filterCode,
      data.manufacturer,
      data.tier,
      data.duty,
      data.region,
      data.confidence,
      data.method,
      data.cached ? 'YES' : 'NO'
    ];

    await this.sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Sheet1!A:I',
      valueInputOption: 'USER_ENTERED',
      resource: { values: [row] }
    });
  }

  async exportClassification(filterCode, classification) {
    try {
      await this.appendRow({
        filterCode,
        ...classification
      });
      return { success: true };
    } catch (error) {
      console.error('❌ Error exporting to Sheets:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new SheetsService();
