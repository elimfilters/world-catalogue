const mongoose = require('mongoose');

const filterClassificationSchema = new mongoose.Schema({
  originalCode: { type: String, required: true, index: true },
  manufacturer: { type: String, index: true },
  filterType: { type: String, index: true },
  duty: { type: String, index: true },
  elimfiltersPrefix: { type: String, index: true },
  elimfiltersSKU: { type: String, unique: true },
  technology: String,
  crossReferenceCode: { type: String, index: true },
  crossReferences: [String],
  confidence: String,
  reasoning: String,
  detectedManufacturer: mongoose.Schema.Types.Mixed,
  evaluationMatrix: [mongoose.Schema.Types.Mixed],
  selectedStrategy: String,
  finalScore: Number,
  applications: [String]
}, { timestamps: true });

// Índices compuestos para búsquedas comunes
filterClassificationSchema.index({ manufacturer: 1, duty: 1 });
filterClassificationSchema.index({ filterType: 1, duty: 1 });
filterClassificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('FilterClassification', filterClassificationSchema);
