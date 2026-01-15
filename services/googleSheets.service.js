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
      
      await this.Filter.findOneAndUpdate(
        { originalCode: filterCode },
        dataToSave,
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
