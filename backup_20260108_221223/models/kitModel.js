const mongoose = require('mongoose');

const kitSchema = new mongoose.Schema({
    kit_sku: { type: String, required: true, unique: true },
    description: String,
    filters: [{
        filter_sku: String,
        quantity: Number
    }],
    machine_model: String
}, { timestamps: true });

module.exports = mongoose.model('Kit', kitSchema);
