const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");

class GoogleSheetsService {
  constructor() {
    this.doc = null;
    this.masterSheet = null;
    this.kitsSheet = null;
    this.isInitialized = false;
    this.MongoFilter = null;
  }

  async initialize() {
    if (this.isInitialized) return;

    // MongoDB
    try {
      this.MongoFilter = require("../models/FilterClassification");
    } catch (error) {
      console.error("[Cache] MongoDB model error:", error.message);
    }

    // Google Sheets
    const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
    const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const PRIVATE_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

    if (!CLIENT_EMAIL || !PRIVATE_KEY) {
      console.log("[Sheets] Service account not configured");
      this.isInitialized = true;
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
      
      this.masterSheet = this.doc.sheetsByTitle["MASTER_UNIFIED_V5"];
      this.kitsSheet = this.doc.sheetsByTitle["MASTER_KITS_V1"];
      
      if (this.masterSheet) console.log("[Sheets] ✅ MASTER_UNIFIED_V5 ready");
      if (this.kitsSheet) console.log("[Sheets] ✅ MASTER_KITS_V1 ready");

      this.isInitialized = true;
    } catch (error) {
      console.error("[Sheets] Init error:", error.message);
      this.isInitialized = true;
    }
  }

  async searchFilterByCode(filterCode) {
    await this.initialize();

    // 1. Buscar en MASTER_UNIFIED_V5
    if (this.masterSheet) {
      try {
        const rows = await this.masterSheet.getRows();
        for (let i = 0; i < rows.length; i++) {
          const inputCode = rows[i].get("Input Code");
          if (inputCode === filterCode) {
            console.log("[Sheets] ✅ Found in MASTER_UNIFIED_V5");
            return {
              filterCode: inputCode,
              elimfiltersSKU: rows[i].get("ELIMFILTERS SKU"),
              description: rows[i].get("Description"),
              filterType: rows[i].get("Filter Type"),
              elimfiltersPrefix: rows[i].get("Prefix"),
              duty: rows[i].get("Duty"),
              source: "google_sheets"
            };
          }
        }
      } catch (error) {
        console.error("[Sheets] MASTER_UNIFIED_V5 error:", error.message);
      }
    }

    // 2. Buscar en MASTER_KITS_V1
    if (this.kitsSheet) {
      try {
        const rows = await this.kitsSheet.getRows();
        for (let i = 0; i < rows.length; i++) {
          const inputCode = rows[i].get("Input Code");
          if (inputCode === filterCode) {
            console.log("[Sheets] ✅ Found in MASTER_KITS_V1");
            return {
              filterCode: inputCode,
              elimfiltersSKU: rows[i].get("ELIMFILTERS SKU"),
              description: rows[i].get("Description"),
              filterType: rows[i].get("Filter Type"),
              elimfiltersPrefix: rows[i].get("Prefix"),
              duty: rows[i].get("Duty"),
              source: "google_sheets_kits"
            };
          }
        }
      } catch (error) {
        console.error("[Sheets] MASTER_KITS_V1 error:", error.message);
      }
    }

    // 3. Buscar en MongoDB cache
    if (this.MongoFilter) {
      try {
        const filter = await this.MongoFilter.findOne({ originalCode: filterCode });
        if (filter) {
          console.log("[Cache] ✅ Found in MongoDB");
          return {
            filterCode: filter.originalCode,
            elimfiltersSKU: filter.elimfiltersSKU,
            filterType: filter.filterType,
            elimfiltersPrefix: filter.elimfiltersPrefix,
            duty: filter.duty,
            source: "mongodb_cache"
          };
        }
      } catch (error) {
        console.error("[Cache] MongoDB error:", error.message);
      }
    }

    return null;
  }

  async saveFilter(filterCode, result) {
    await this.initialize();
    if (!this.MongoFilter) return false;

    try {
      const dataToSave = {
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
      };
      
      await this.MongoFilter.findOneAndUpdate(
        { originalCode: filterCode },
        dataToSave,
        { upsert: true, new: true }
      );
      console.log("[Cache] ✅ Saved to MongoDB");
      return true;
    } catch (error) {
      console.error("[Cache] Save error:", error.message);
      return false;
    }
  }
}

module.exports = new GoogleSheetsService();
