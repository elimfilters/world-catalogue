const Filter = require("../models/filter.model");

class GoogleSheetsService {
  async initialize() {
    console.log("[Cache] Using MongoDB instead of Google Sheets");
  }

  async searchFilterByCode(filterCode) {
    try {
      console.log("[Cache] Searching MongoDB for:", filterCode);
      const filter = await Filter.findOne({ filterCode });
      
      if (filter) {
        console.log("[Cache] ✅ Found in MongoDB");
        return {
          filterCode: filter.filterCode,
          elimfiltersSKU: filter.elimfiltersSKU,
          description: filter.description,
          filterType: filter.filterType,
          elimfiltersPrefix: filter.elimfiltersPrefix,
          duty: filter.duty
        };
      }
      
      console.log("[Cache] Not found in MongoDB");
      return null;
    } catch (error) {
      console.error("[Cache] Search error:", error.message);
      return null;
    }
  }

  async saveFilter(filterCode, classificationResult) {
    try {
      await Filter.findOneAndUpdate(
        { filterCode },
        classificationResult,
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
