const mongoose = require('mongoose');
const filterSchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true, index: true, trim: true, uppercase: true },
  description: { type: String },
  filter_type: { type: String, enum: ['LUBE OIL', 'FUEL', 'AIR', 'HYDRAULIC', 'COOLANT', 'TRANSMISSION', 'OTHER'], index: true },
  tier: { type: String, enum: ['PERFORMANCE', 'PREMIUM', 'STANDARD'], default: 'PERFORMANCE' },
  oem_codes: [{ code: { type: String, required: true, trim: true, uppercase: true }, manufacturer: { type: String, required: true, trim: true } }],
  cross_reference_codes: [{ code: { type: String, required: true, trim: true, uppercase: true }, manufacturer: { type: String, required: true, trim: true } }],
  micron_rating: { type: String },
  nominal_efficiency_percent: { type: Number, min: 0, max: 100 },
  media_type: { type: String, enum: ['CELLULOSE', 'SYNTHETIC', 'BLEND', 'GLASS FIBER', 'METAL MESH', 'OTHER'] }
}, { timestamps: true, collection: 'filters' });
filterSchema.methods.toClientJSON = function() { const obj = this.toObject(); delete obj.__v; return obj; };
module.exports = mongoose.model('Filter', filterSchema);
