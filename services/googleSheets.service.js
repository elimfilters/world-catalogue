const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");

class GoogleSheetsService {
  constructor() {
    this.doc = null;
    this.sheet = null;
    this.isInitialized = false;
    this.SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
    this.CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    this.PRIVATE_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  }

  async initialize() {
    if (this.isInitialized) return;
    if (!this.CLIENT_EMAIL || !this.PRIVATE_KEY) {
      throw new Error("Service account not configured");
    }

    const serviceAccountAuth = new JWT({
      email: this.CLIENT_EMAIL,
      key: this.PRIVATE_KEY.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    this.doc = new GoogleSpreadsheet(this.SPREADSHEET_ID, serviceAccountAuth);
    await this.doc.loadInfo();
    this.sheet = this.doc.sheetsByTitle["MASTER_UNIFIED_V5"];
    if (!this.sheet) throw new Error("Sheet not found");
    this.isInitialized = true;
    console.log("[Sheets] Initialized");
  }

  async searchFilterByCode(filterCode) {
    await this.initialize();
    console.log("[Sheets] Searching:", filterCode);
    const rows = await this.sheet.getRows();
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].get("filterCode") === filterCode) {
        console.log("[Sheets] Found in row", i + 1);
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
  }

  async saveFilter(filterCode, classificationResult) {
    await this.initialize();
    const row = {
      filterCode: filterCode,
      elimfiltersSKU: classificationResult.elimfiltersSKU || "",
      description: classificationResult.description || "",
      filterType: classificationResult.filterType || "",
      elimfiltersPrefix: classificationResult.elimfiltersPrefix || "",
      duty: classificationResult.duty || ""
    };
    await this.sheet.addRow(row);
    console.log("[Sheets] Saved");
    return true;
  }
}

module.exports = new GoogleSheetsService();
