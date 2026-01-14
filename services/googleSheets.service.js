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
      console.log('✅ Google Sheets API inicializada');
    } catch (error) {
      console.error('❌ Error inicializando Google Sheets:', error.message);
      throw error;
    }
  }

  async searchInMasterUnified(filterCode) {
    await this.initialize();
    
    try {
      console.log(`🔍 Buscando "${filterCode}" en MASTER_UNIFIED_V5...`);
      const range = 'MASTER_UNIFIED_V5!A:Z';
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.SPREADSHEET_ID,
        range
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        console.log('⚠️  MASTER_UNIFIED_V5 está vacía');
        return null;
      }

      const headerRow = rows[0];
      const dataRows = rows.slice(1);

      // Buscar el código en cualquier columna
      const resultIndex = dataRows.findIndex(row => {
        return row.some(cell => 
          cell && cell.toString().trim().toUpperCase() === filterCode.toUpperCase()
        );
      });

      if (resultIndex === -1) {
        console.log(`❌ No encontrado en MASTER_UNIFIED_V5`);
        return null;
      }

      const result = dataRows[resultIndex];
      const mapped = {};
      
      headerRow.forEach((header, index) => {
        mapped[header] = result[index] || '';
      });
      
      console.log(`✅ ENCONTRADO en MASTER_UNIFIED_V5 (fila ${resultIndex + 2})`);
      
      return {
        source: 'MASTER_UNIFIED_V5',
        rowNumber: resultIndex + 2,
        data: mapped,
        rawRow: result
      };
    } catch (error) {
      console.error('Error buscando en MASTER_UNIFIED_V5:', error.message);
      return null;
    }
  }

  async searchInMasterKits(searchValue, searchType = 'VIN') {
    await this.initialize();
    
    try {
      console.log(`🔍 Buscando "${searchValue}" en MASTER_KITS_V1 (${searchType})...`);
      const range = 'MASTER_KITS_V1!A:Z';
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.SPREADSHEET_ID,
        range
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        console.log('⚠️  MASTER_KITS_V1 está vacía');
        return null;
      }

      const headerRow = rows[0];
      const dataRows = rows.slice(1);

      // Buscar columna según tipo
      const searchColumns = searchType === 'VIN' 
        ? headerRow.map((h, i) => h.toLowerCase().includes('vin') ? i : -1).filter(i => i !== -1)
        : headerRow.map((h, i) => h.toLowerCase().includes('equipment') ? i : -1).filter(i => i !== -1);

      if (searchColumns.length === 0) {
        console.log(`⚠️  No se encontró columna ${searchType} en MASTER_KITS_V1`);
        return null;
      }

      const resultIndex = dataRows.findIndex(row => {
        return searchColumns.some(colIndex => 
          row[colIndex] && 
          row[colIndex].toString().trim().toUpperCase() === searchValue.toUpperCase()
        );
      });

      if (resultIndex === -1) {
        console.log(`❌ No encontrado en MASTER_KITS_V1`);
        return null;
      }

      const result = dataRows[resultIndex];
      const mapped = {};
      
      headerRow.forEach((header, index) => {
        mapped[header] = result[index] || '';
      });
      
      console.log(`✅ ENCONTRADO en MASTER_KITS_V1 (fila ${resultIndex + 2})`);
      
      return {
        source: 'MASTER_KITS_V1',
        searchType,
        rowNumber: resultIndex + 2,
        data: mapped,
        rawRow: result
      };
    } catch (error) {
      console.error('Error buscando en MASTER_KITS_V1:', error.message);
      return null;
    }
  }

  async searchFilter(filterCode, searchContext = 'individual') {
    try {
      console.log(`\n🎯 Búsqueda en Google Sheets: "${filterCode}" (contexto: ${searchContext})`);

      if (searchContext === 'individual' || searchContext === 'part_number') {
        return await this.searchInMasterUnified(filterCode);
      } 
      
      if (searchContext === 'vin') {
        return await this.searchInMasterKits(filterCode, 'VIN');
      } 
      
      if (searchContext === 'equipment') {
        return await this.searchInMasterKits(filterCode, 'EQUIPMENT');
      }

      // Búsqueda completa si no se especifica contexto
      let result = await this.searchInMasterUnified(filterCode);
      
      if (!result) {
        result = await this.searchInMasterKits(filterCode, 'VIN');
      }
      
      if (!result) {
        result = await this.searchInMasterKits(filterCode, 'EQUIPMENT');
      }

      return result;
    } catch (error) {
      console.error('Error en búsqueda de filtro:', error.message);
      return null;
    }
  }

  async appendToMasterUnified(data) {
    await this.initialize();
    
    try {
      const range = 'MASTER_UNIFIED_V5!A:Z';
      
      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.SPREADSHEET_ID,
        range,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [data]
        }
      });

      console.log(`✅ Datos agregados a MASTER_UNIFIED_V5`);
      return response.data;
    } catch (error) {
      console.error('Error agregando a MASTER_UNIFIED_V5:', error.message);
      throw error;
    }
  }
}

module.exports = new GoogleSheetsService();

// Buscar filtro existente por código
async function searchFilterByCode(filterCode) {
  try {
    const sheets = await authenticate();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'MASTER_UNIFIED_V5!A:C'
    });

    const rows = response.data.values || [];
    
    // Buscar en columna A (Input Code)
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === filterCode) {
        return {
          filterCode: rows[i][0],
          elimfiltersSKU: rows[i][1],
          description: rows[i][2]
        };
      }
    }

    return null;
  } catch (error) {
    console.error('[Sheets] Search error:', error.message);
    return null;
  }
}

// Guardar nuevo filtro
async function saveFilter(filterCode, classificationResult) {
  try {
    const sheets = await authenticate();
    
    const row = [
      filterCode,
      classificationResult.elimfiltersSKU || '',
      classificationResult.description || '',
      classificationResult.filterType || '',
      classificationResult.elimfiltersPrefix || '',
      classificationResult.duty || ''
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'MASTER_UNIFIED_V5!A:F',
      valueInputOption: 'USER_ENTERED',
      resource: { values: [row] }
    });

    console.log('[Sheets] Filter saved successfully');
    return true;
  } catch (error) {
    console.error('[Sheets] Save error:', error.message);
    return false;
  }
}

module.exports = new GoogleSheetsService();
