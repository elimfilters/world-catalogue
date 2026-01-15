class GoogleSheetsService {
  constructor() {
    this.Filter = null;
  }

  async initialize() {
    if (!this.Filter) {
      this.Filter = require("../models/FilterClassification");
      console.log("[Cache] MongoDB cache ready");
    }
  }

  async searchFilterByCode(filterCode) {
    await this.initialize();
    try {
      const filter = await this.Filter.findOne({ originalCode: filterCode });
      if (filter) {
        console.log("[Cache] ✅ Found");
        return {
          filterCode: filter.originalCode,
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

  async saveFilter(filterCode, result) {
    await this.initialize();
    try {
      await this.Filter.findOneAndUpdate(
        { originalCode: filterCode },
        { ...result, originalCode: filterCode },
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
