const { google } = require("googleapis");
const path = require("path");

class GoogleSheetsService {
  constructor() {
    this.sheetId = "1ZYI5c0enkuvWAveu8HMaCUk1cek_VDrX8GtgKW7VP6U";
    this.auth = null;
    this.sheets = null;
  }

  async initialize() {
    try {
      const credentialsPath = path.join(__dirname, "..", "config", "google-credentials.json");
      
      this.auth = new google.auth.GoogleAuth({
        keyFile: credentialsPath,
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
      });

      const authClient = await this.auth.getClient();
      this.sheets = google.sheets({ version: "v4", auth: authClient });
      
      console.log("✅ Google Sheets conectado con Service Account");
      return true;
      
    } catch (error) {
      console.error("❌ Error conectando Google Sheets:", error.message);
      return false;
    }
  }

  async searchUnified(code) {
    console.log(`📊 [GOOGLE SHEETS] Buscando en MASTER_UNIFIED_V5: ${code}`);
    
    try {
      if (!this.sheets) {
        await this.initialize();
      }

      if (!this.sheets) {
        console.log("   ⚠️  Sheets no disponible");
        return null;
      }

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetId,
        range: "MASTER_UNIFIED_V5!A:Z",
      });

      const rows = response.data.values;
      
      if (!rows || rows.length === 0) {
        console.log("   ❌ No hay datos en la hoja");
        return null;
      }

      const headers = rows[0];
      const codeColumnIndex = headers.findIndex(h => 
        h.toLowerCase().includes("code") || 
        h.toLowerCase().includes("sku") ||
        h.toLowerCase().includes("part")
      );

      if (codeColumnIndex === -1) {
        console.log("   ❌ No se encontró columna de código");
        return null;
      }

      const searchCode = code.toUpperCase().trim();
      
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rowCode = (row[codeColumnIndex] || "").toUpperCase().trim();
        
        if (rowCode === searchCode) {
          console.log(`   ✅ Encontrado en fila ${i + 1}`);
          
          const result = {};
          headers.forEach((header, index) => {
            result[header] = row[index] || "";
          });
          
          return {
            source: "GOOGLE_SHEETS_UNIFIED",
            sheet: "MASTER_UNIFIED_V5",
            row: i + 1,
            data: result
          };
        }
      }

      console.log("   ℹ️  Código no encontrado en MASTER_UNIFIED_V5");
      return null;
      
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      return null;
    }
  }

  async searchKits(code) {
    console.log(`📊 [GOOGLE SHEETS] Buscando en MASTER_KITS_V1: ${code}`);
    
    try {
      if (!this.sheets) {
        await this.initialize();
      }

      if (!this.sheets) {
        console.log("   ⚠️  Sheets no disponible");
        return null;
      }

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetId,
        range: "MASTER_KITS_V1!A:Z",
      });

      const rows = response.data.values;
      
      if (!rows || rows.length === 0) {
        console.log("   ❌ No hay datos en la hoja");
        return null;
      }

      const headers = rows[0];
      const codeColumnIndex = headers.findIndex(h => 
        h.toLowerCase().includes("code") || 
        h.toLowerCase().includes("sku") ||
        h.toLowerCase().includes("kit")
      );

      if (codeColumnIndex === -1) {
        console.log("   ❌ No se encontró columna de código");
        return null;
      }

      const searchCode = code.toUpperCase().trim();
      
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rowCode = (row[codeColumnIndex] || "").toUpperCase().trim();
        
        if (rowCode === searchCode) {
          console.log(`   ✅ Encontrado en fila ${i + 1}`);
          
          const result = {};
          headers.forEach((header, index) => {
            result[header] = row[index] || "";
          });
          
          return {
            source: "GOOGLE_SHEETS_KITS",
            sheet: "MASTER_KITS_V1",
            row: i + 1,
            data: result
          };
        }
      }

      console.log("   ℹ️  Código no encontrado en MASTER_KITS_V1");
      return null;
      
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      return null;
    }
  }

  async searchCode(code) {
    let result = await this.searchUnified(code);
    if (result) return result;
    
    result = await this.searchKits(code);
    return result;
  }
}

module.exports = new GoogleSheetsService();
