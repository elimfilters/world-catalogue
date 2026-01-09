const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID, serviceAccountAuth);

async function searchInSheets(code) {
  try {
    await doc.loadInfo();
    
    // Buscar en MASTER_UNIFIED_V5 (filtros individuales)
    const unifiedSheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'];
    if (unifiedSheet) {
      const rows = await unifiedSheet.getRows();
      const found = rows.find(row => 
        row.get('Original_Code')?.toUpperCase() === code.toUpperCase() ||
        row.get('ELIMFILTERS_SKU')?.toUpperCase() === code.toUpperCase() ||
        row.get('Donaldson_Code')?.toUpperCase() === code.toUpperCase()
      );
      
      if (found) {
        return {
          success: true,
          source: 'google_sheets_unified',
          data: found.toObject()
        };
      }
    }
    
    // Buscar en MASTER_KITS_V1 (kits VIN/Equipment)
    const kitsSheet = doc.sheetsByTitle['MASTER_KITS_V1'];
    if (kitsSheet) {
      const rows = await kitsSheet.getRows();
      const found = rows.find(row => 
        row.get('Kit_Code')?.toUpperCase() === code.toUpperCase() ||
        row.get('VIN')?.toUpperCase() === code.toUpperCase()
      );
      
      if (found) {
        return {
          success: true,
          source: 'google_sheets_kits',
          data: found.toObject()
        };
      }
    }
    
    return { success: false, message: 'Not found in Google Sheets' };
    
  } catch (error) {
    console.error('Google Sheets error:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = { searchInSheets };