const { google } = require('googleapis');
const FilterClassification = require('../models/FilterClassification');

const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

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
      
      // Buscar en MASTER_UNIFIED_V5
      const unified = await this.searchInSheet('MASTER_UNIFIED_V5!A:Z', filterCode);
      if (unified) return unified;
      
      // Buscar en MASTER_KITS_V1
      const kits = await this.searchInSheet('MASTER_KITS_V1!A:Z', filterCode);
      if (kits) return kits;
      
      // Buscar en MongoDB como caché
      const cached = await FilterClassification.findOne({ 
        originalCode: new RegExp(`^${filterCode}$`, 'i') 
      });
      
      if (cached) {
        console.log('[Sheets] Found in MongoDB cache');
        return cached.toObject();
      }
      
      console.log('[Sheets] Not found anywhere');
      return null;
      
    } catch (error) {
      console.error('[Sheets] Error:', error.message);
      throw error;
    }
  }

  async searchInSheet(range, filterCode) {
    try {
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: range
      });

      const rows = result.data.values;
      if (!rows || rows.length === 0) {
        return null;
      }

      const headers = rows[0];
      const codeIndex = headers.findIndex(h => 
        h && (h.toLowerCase().includes('code') || 
              h.toLowerCase().includes('part number') ||
              h.toLowerCase().includes('sku'))
      );

      if (codeIndex === -1) {
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
        
        console.log('[Sheets] Found in sheet:', range);
        return filterData;
      }

      return null;
      
    } catch (error) {
      console.error(`[Sheets] Error searching in ${range}:`, error.message);
      return null;
    }
  }

  async saveFilter(filterCode, classificationData) {
    try {
      console.log('[Sheets] Saving filter to MongoDB:', filterCode);
      
      // Guardar en MongoDB
      const filter = new FilterClassification({
        originalCode: filterCode,
        ...classificationData
      });
      
      await filter.save();
      console.log('[Sheets] Filter saved successfully');
      
      return filter;
      
    } catch (error) {
      console.error('[Sheets] Error saving filter:', error.message);
      throw error;
    }
  }
}

module.exports = new GoogleSheetsService();
