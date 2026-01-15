class GoogleSheetsService {
  constructor() {
    this.MongoFilter = null;
  }

  async initialize() {
    try {
      this.MongoFilter = require("../models/FilterClassification");
      console.log("[Cache] MongoDB ready");
    } catch (error) {
      console.error("[Cache] Error:", error.message);
    }
  }

  async searchFilterByCode(filterCode) {
    await this.initialize();
    if (!this.MongoFilter) return null;

    try {
      const filter = await this.MongoFilter.findOne({ originalCode: filterCode });
      if (filter) {
        console.log("[Cache] ✅ Found");
        return {
          filterCode: filter.originalCode,
          elimfiltersSKU: filter.elimfiltersSKU,
          filterType: filter.filterType,
          elimfiltersPrefix: filter.elimfiltersPrefix,
          duty: filter.duty,
          source: "mongodb_cache"
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
      console.log("[Cache] ✅ Saved");
      return true;
    } catch (error) {
      console.error("[Cache] Error:", error.message);
      return false;
    }
  }
}

module.exports = new GoogleSheetsService();
