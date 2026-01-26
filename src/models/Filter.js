const mongoose = require('mongoose');
const filterSchema = new mongoose.Schema({
    sku: { type: String, unique: true },
    input_code: String,
    part_number: String,
    description: String,
    filter_type: String,
    subtype: String,
    prefix: String,
    technology: String,
    duty: String,
    specs: mongoose.Schema.Types.Mixed,
    oem_codes: [String],
    cross_references: [String],
    created_at: { type: Date, default: Date.now }
}, { strict: false });
module.exports = mongoose.model('Filter', filterSchema);