const mongoose = require("mongoose");

const scrapedFilterSchema = new mongoose.Schema({
  input_code: { type: String, required: true, index: true },
  elimfilters_sku: { type: String, required: true, unique: true },
  manufacturer: { type: String, required: true },
  duty: { type: String, required: true },
  scraped_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model("ScrapedFilter", scrapedFilterSchema);
