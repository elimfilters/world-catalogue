const mongoose = require('mongoose');

const filterClassificationSchema = new mongoose.Schema({
  filterCode: { type: String, required: true, unique: true },
  manufacturer: String,
  tier: String,
  duty: String,
  region: String,
  confidence: String,
  method: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FilterClassification', filterClassificationSchema);
