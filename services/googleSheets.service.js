const mongoose = require("mongoose");

class GoogleSheetsService {
  async initialize() {
    console.log("[Cache] Using MongoDB cache");
  }

  async searchFilterByCode(filterCode) {
    try {
      console.log("[Cache] Searching MongoDB:", filterCode);
      const Filter = mongoose.model("Filter");
      const filter = await Filter.findOne({ filterCode });
      
      if (filter) {
        console.log("[Cache] ✅ Found");
        return {
          filterCode: filter.filterCode,
          elimfiltersSKU: filter.elimfiltersSKU,
          description: filter.description,
          filterType: filter.filterType,
          elimfiltersPrefix: filter.elimfiltersPrefix,
          duty: filter.duty
        };
      }
      
      return null;
    } catch (error) {
      console.error("[Cache] Error:", error.message);
      return null;
    }
  }

  async saveFilter(filterCode, classificationResult) {
    try {
      const Filter = mongoose.model("Filter");
      await Filter.findOneAndUpdate(
        { filterCode },
        classificationResult,
        { upsert: true, new: true }
      );
      console.log("[Cache] ✅ Saved");
      return true;
    } catch (error) {
      console.error("[Cache] Error:", error.message);
      return false;
    }
  }
}

module.exports = new GoogleSheetsService();
