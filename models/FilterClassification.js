const mongoose = require('mongoose');

const filterClassificationSchema = new mongoose.Schema({
  originalCode: { type: String, required: true, index: true, trim: true, uppercase: true },
  manufacturer: { type: String, required: true, index: true },
  filterType: { type: String, required: true, enum: ['OIL', 'AIR', 'CABIN', 'FUEL', 'HYDRO', 'TRANS', 'COOL', 'FUEL_WATER', 'AIR_SAFETY', 'BREATHER'], index: true },
  duty: { type: String, required: true, enum: ['HD', 'LD'], index: true },
  elimfiltersPrefix: { type: String, required: true, enum: ['ESO', 'EPO', 'EHO', 'ESA', 'EPA', 'EHA', 'ESF', 'EPF', 'EHF', 'ESC', 'EPC', 'EHC', 'ESH', 'EPH', 'EHH', 'EMO', 'EMA', 'EMF', 'EMC', 'ELO', 'ELOP', 'ELOH', 'ELA', 'ELC', 'ELF'] },
  elimfiltersSKU: { type: String, required: true, unique: true, index: true },
  technology: { type: String, enum: ['SYNTRAX™', 'NANOFORCE™', 'SYNTEPORE™', 'MARINEGUARD™', 'AQUAGUARD™', 'Standard'] },
  confidence: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  reasoning: { type: String },
  detectedManufacturer: { type: mongoose.Schema.Types.Mixed },
  crossReferences: [{ manufacturer: String, code: String }],
  applications: [{ make: String, model: String, year: String, engine: String }],
  metadata: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

filterClassificationSchema.index({ manufacturer: 1, duty: 1 });
filterClassificationSchema.index({ filterType: 1, duty: 1 });
filterClassificationSchema.index({ elimfiltersPrefix: 1 });
filterClassificationSchema.index({ createdAt: -1 });

filterClassificationSchema.methods.getDescription = function() {
  const dutyName = this.duty === 'HD' ? 'Heavy Duty' : 'Light Duty';
  const filterTypeMap = {
    'OIL': 'Oil Filter', 'AIR': 'Air Filter', 'CABIN': 'Cabin Air Filter',
    'FUEL': 'Fuel Filter', 'HYDRO': 'Hydraulic Filter', 'TRANS': 'Transmission Filter',
    'COOL': 'Coolant Filter', 'FUEL_WATER': 'Fuel Water Separator',
    'AIR_SAFETY': 'Safety Air Filter', 'BREATHER': 'Breather Filter'
  };
  return `${this.manufacturer} ${filterTypeMap[this.filterType]} (${dutyName})`;
};

filterClassificationSchema.statics.findByOriginalCode = function(code) {
  return this.findOne({ originalCode: code.trim().toUpperCase() });
};

filterClassificationSchema.statics.findBySKU = function(sku) {
  return this.findOne({ elimfiltersSKU: sku.trim().toUpperCase() });
};

module.exports = mongoose.model('FilterClassification', filterClassificationSchema);
