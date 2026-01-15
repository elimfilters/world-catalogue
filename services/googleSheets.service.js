const { google } = require('googleapis');
const path = require('path');

class GoogleSheetsService {
  constructor() {
    this.sheets = null;
    this.auth = null;
    this.spreadsheetId = '1ZYI5c0enkuvWAveu8HMaCUk1cek_VDrX8GtgKW7VP6U';
    this.MongoFilter = null;
    
    // Mapeo de tipos de Google Sheets a tipos del sistema
    this.typeMapping = {
      'Air': 'AIR',
      'Fuel': 'FUEL',
      'Cabin': 'CABIN',
      'Hidraulic': 'HYDRAULIC',
      'Hydraulic': 'HYDRAULIC',
      'Oíl': 'OIL',
      'Oil': 'OIL',
      'Coolant': 'COOLANT',
      'Marina': 'MARINE',
      'Turbinas': 'TURBINE',
      'Turbine': 'TURBINE',
      'Air Dryer': 'AIR_DRYER',
      'Fuel Separator': 'FUEL_SEPARATOR',
      'Maintenance Kits HD': 'KIT_HD',
      'Maintenance Kits LD': 'KIT_LD',
      'Maintenance Kit HD': 'KIT_HD',
      'Maintenance Kit LD': 'KIT_LD'
    };
    
    this.prefixMap = {
      'AIR': 'EA1',
      'FUEL': 'EF9',
      'CABIN': 'EC1',
      'HYDRAULIC': 'EH6',
      'OIL': 'EL8',
      'COOLANT': 'EW7',
      'MARINE': 'EM9',
      'TURBINE': 'ET9',
      'AIR_DRYER': 'ED4',
      'FUEL_SEPARATOR': 'ES9',
      'KIT_HD': 'EK5',
      'KIT_LD': 'EK3'
    };
  }

  async initialize() {
    try {
      this.MongoFilter = require('../models/FilterClassification');
      console.log('[Cache] MongoDB ready');

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
          console.log(\[Cache] ✅ Found in MongoDB: \\);
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
        console.log(\[Sheets] Searching for \ in Google Sheets...\);
        
        const result = await this.searchInSheet('MASTER_UNIFIED_V5', filterCode);
        if (result) {
          console.log(\[Sheets] ✅ Found in MASTER_UNIFIED_V5: \\);
          await this.saveFilter(filterCode, result);
          return result;
        }

        const kitResult = await this.searchInSheet('MASTER_KITS_V1', filterCode);
        if (kitResult) {
          console.log(\[Sheets] ✅ Found in MASTER_KITS_V1: \\);
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
        range: \\!A:AZ\,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        console.log(\[Sheets] No data in \\);
        return null;
      }

      const headers = rows[0];
      
      // Find column indices
      const inputCodeCol = headers.findIndex(h => h && h.toLowerCase().includes('input code'));
      const skuCol = headers.findIndex(h => h && h.toLowerCase().includes('elimfilters sku'));
      const typeCol = headers.findIndex(h => h && h.toLowerCase().includes('filter type'));
      const prefixCol = headers.findIndex(h => h && h.toLowerCase().includes('prefix'));
      const dutyCol = headers.findIndex(h => h && h.toLowerCase().includes('duty'));
      const crossRefCol = headers.findIndex(h => h && h.toLowerCase().includes('cross reference'));

      // Search for the filter code
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row[inputCodeCol] && row[inputCodeCol].toString().toUpperCase() === filterCode.toUpperCase()) {
          console.log(\[Sheets] Match found at row \\);
          
          // Map filter type from Google Sheets to system type
          const sheetType = row[typeCol]?.toString().trim() || 'Oil';
          const systemType = this.typeMapping[sheetType] || 'OIL';
          const prefix = this.prefixMap[systemType] || 'EL8';
          
          // Extract duty (handle HD/LD format)
          let duty = row[dutyCol]?.toString().trim() || 'HD';
          if (duty.includes('/')) {
            duty = duty.split('/')[0]; // Take first duty if multiple
          }
          
          // Extract cross reference
          let crossRefCode = null;
          if (row[crossRefCol]) {
            const crossRefs = row[crossRefCol].toString().split(/[,;|]/).map(c => c.trim());
            crossRefCode = crossRefs[0] || null;
          }

          return {
            filterCode: row[inputCodeCol],
            elimfiltersSKU: row[skuCol] || null,
            filterType: systemType,
            elimfiltersPrefix: prefix,
            duty: duty,
            crossReferenceCode: crossRefCode,
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
      console.log(\[Cache] ✅ Saved to MongoDB: \\);
      return true;
    } catch (error) {
      console.error('[Cache] Save error:', error.message);
      return false;
    }
  }
}

module.exports = new GoogleSheetsService();
