const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");

class GoogleSheetsService {
  constructor() {
    this.doc = null;
    this.sheet = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
    const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const PRIVATE_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

    if (!CLIENT_EMAIL || !PRIVATE_KEY) {
      console.log("[Sheets] Service account not configured - skipping");
      return;
    }

    try {
      const serviceAccountAuth = new JWT({
        email: CLIENT_EMAIL,
        key: PRIVATE_KEY.replace(/\\n/g, "\n"),
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });

      this.doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
      await this.doc.loadInfo();
      this.sheet = this.doc.sheetsByTitle["MASTER_UNIFIED_V5"];
      
      if (!this.sheet) {
        console.log("[Sheets] Sheet MASTER_UNIFIED_V5 not found");
        return;
      }

      this.isInitialized = true;
      console.log("[Sheets] ✅ Initialized successfully");
    } catch (error) {
      console.error("[Sheets] ❌ Init error:", error.message);
    }
  }

  async searchFilterByCode(filterCode) {
    await this.initialize();
    if (!this.isInitialized) return null;

    try {
      console.log("[Sheets] Searching:", filterCode);
      const rows = await this.sheet.getRows();
      
      for (let i = 0; i < rows.length; i++) {
        if (rows[i].get("filterCode") === filterCode) {
          console.log("[Sheets] ✅ Found in row", i + 1);
          return {
            filterCode: rows[i].get("filterCode"),
            elimfiltersSKU: rows[i].get("elimfiltersSKU"),
            description: rows[i].get("description"),
            filterType: rows[i].get("filterType"),
            elimfiltersPrefix: rows[i].get("elimfiltersPrefix"),
            duty: rows[i].get("duty")
          };
        }
      }
      
      console.log("[Sheets] Not found");
      return null;
    } catch (error) {
      console.error("[Sheets] Search error:", error.message);
      return null;
    }
  }

  async saveFilter(filterCode, classificationResult) {
    await this.initialize();
    if (!this.isInitialized) return false;

    try {
      const row = {
        filterCode: filterCode,
        elimfiltersSKU: classificationResult.elimfiltersSKU || "",
        description: classificationResult.description || "",
        filterType: classificationResult.filterType || "",
        elimfiltersPrefix: classificationResult.elimfiltersPrefix || "",
        duty: classificationResult.duty || ""
      };

      await this.sheet.addRow(row);
      console.log("[Sheets] ✅ Saved");
      return true;
    } catch (error) {
      console.error("[Sheets] Save error:", error.message);
      return false;
    }
  }
}

module.exports = new GoogleSheetsService();
