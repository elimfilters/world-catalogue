const { google } = require('googleapis');
const path = require('path');

class GoogleSheetsService {
  constructor() {
    this.sheets = null;
    this.auth = null;
    this.spreadsheetId = '1ZYI5c0enkuvWAveu8HMaCUk1cek_VDrX8GtgKW7VP6U';
    this.MongoFilter = null;
  }

  async initialize() {
    try {
      // Initialize MongoDB
      this.MongoFilter = require('../models/FilterClassification');
      console.log('[Cache] MongoDB ready');

      // Initialize Google Sheets API
      const credentialsPath = path.join(__dirname, '..', 'google-credentials.json');
      this.auth = new google.auth.GoogleAuth({
        keyFile: credentialsPath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      console.log('[Sheets] Google Sheets API ready');
    } catch (error) {
      console.error('[Sheets] Initialization error:', error.message);
    }
  }

  async searchFilterByCode(filterCode) {
    await this.initialize();

    // 1. Try MongoDB cache first
    if (this.MongoFilter) {
      try {
        const filter = await this.MongoFilter.findOne({ originalCode: filterCode });
        if (filter) {
          console.log('[Cache] ✅ Found in MongoDB');
          return {
            filterCode: filter.originalCode,
            elimfiltersSKU: filter.elimfiltersSKU,
            filterType: filter.filterType,
            elimfiltersPrefix: filter.elimfiltersPrefix,
            duty: filter.duty,
            crossReferenceCode: filter.crossReferenceCode,
            source: 'mongodb_cache'
          };
        }
      } catch (error) {
        console.error('[Cache] Error:', error.message);
      }
    }

    // 2. Search in Google Sheets if not in cache
    if (this.sheets) {
      try {
        console.log('[Sheets] Searching in Google Sheets...');
        
        // Search in MASTER_UNIFIED_V5 (individual filters)
        const result = await this.searchInSheet('MASTER_UNIFIED_V5', filterCode);
        if (result) {
          console.log('[Sheets] ✅ Found in MASTER_UNIFIED_V5');
          // Save to MongoDB cache
          await this.saveFilter(filterCode, result);
          return result;
        }

        // Search in MASTER_KITS_V1 (kits)
        const kitResult = await this.searchInSheet('MASTER_KITS_V1', filterCode);
        if (kitResult) {
          console.log('[Sheets] ✅ Found in MASTER_KITS_V1');
          await this.saveFilter(filterCode, kitResult);
          return kitResult;
        }

        console.log('[Sheets] ❌ Not found in Google Sheets');
      } catch (error) {
        console.error('[Sheets] Search error:', error.message);
      }
    }

    return null;
  }

  async searchInSheet(sheetName, filterCode) {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: \\!A:Z\,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) return null;

      // Assume first row is headers
      const headers = rows[0];
      
      // Find column indices (adjust based on your sheet structure)
      const originalCodeCol = headers.findIndex(h => h.toLowerCase().includes('original') || h.toLowerCase().includes('code'));
      const crossRefCol = headers.findIndex(h => h.toLowerCase().includes('cross') || h.toLowerCase().includes('donaldson'));
      const skuCol = headers.findIndex(h => h.toLowerCase().includes('sku') || h.toLowerCase().includes('elimfilters'));
      const typeCol = headers.findIndex(h => h.toLowerCase().includes('type'));
      const dutyCol = headers.findIndex(h => h.toLowerCase().includes('duty'));

      // Search for the filter code
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row[originalCodeCol] && row[originalCodeCol].toString().toUpperCase() === filterCode.toUpperCase()) {
          return {
            filterCode: row[originalCodeCol],
            crossReferenceCode: row[crossRefCol] || null,
            elimfiltersSKU: row[skuCol] || null,
            filterType: row[typeCol] || null,
            duty: row[dutyCol] || null,
            source: 'google_sheets'
          };
        }
      }

      return null;
    } catch (error) {
      console.error(\[Sheets] Error searching in \:\, error.message);
      return null;
    }
  }

  async saveFilter(filterCode, result) {
    if (!this.MongoFilter || !result.elimfiltersSKU) return false;

    try {
      await this.MongoFilter.findOneAndUpdate(
        { originalCode: filterCode },
        {
          originalCode: filterCode,
          manufacturer: result.manufacturer,
          filterType: result.filterType,
          duty: result.duty,
          elimfiltersPrefix: result.elimfiltersPrefix,
          elimfiltersSKU: result.elimfiltersSKU,
          crossReferenceCode: result.crossReferenceCode,
          crossReferences: result.crossReferences?.map(ref => ref.code) || [],
          confidence: result.confidence,
          detectedManufacturer: result.detectedManufacturer
        },
        { upsert: true, new: true }
      );
      console.log('[Cache] ✅ Saved to MongoDB');
      return true;
    } catch (error) {
      console.error('[Cache] Save error:', error.message);
      return false;
    }
  }
}

module.exports = new GoogleSheetsService();
