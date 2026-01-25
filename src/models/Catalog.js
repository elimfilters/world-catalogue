const mongoose = require('mongoose');

const catalogSchema = new mongoose.Schema({
    manufacturer: { type: String, required: true }, // Mann, Wix, Fleetguard, etc.
    manufacturerCode: { type: String, required: true, index: true },
    filterType: String,
    oemCodes: [String],
    crossReferences: {
        fram: String,      // CRÍTICO para la identidad LD
        donaldson: String, // CRÍTICO para la identidad HD
        wix: String,
        mann: String,
        fleetguard: String,
        baldwin: String
    },
    specs: {
        threadSize: String,
        heightMm: Number,
        outerDiameterMm: Number,
        bypassValvePressurePsi: String,
        antiDrainback: Boolean
    },
    applications: [String]
}, { 
    collection: 'catalogs' 
});

module.exports = mongoose.model('Catalog', catalogSchema);
