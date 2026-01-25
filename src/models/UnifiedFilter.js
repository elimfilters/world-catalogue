const mongoose = require('mongoose');

const unifiedFilterSchema = new mongoose.Schema({
    // IDENTIFICACIÓN BÁSICA
    inputCode: { type: String, required: true, index: true },
    elimfiltersSku: { type: String, required: true, unique: true },
    description: String,
    filterType: String,
    subtype: String,
    installationType: String,
    prefix: String,
    elimfiltersTechnology: String,
    duty: { type: String, enum: ['HD', 'LD'], required: true },

    // ESPECIFICACIONES TÉCNICAS (MÉTRICO E IMPERIAL)
    threadSize: String,
    heightMm: Number,
    heightInch: Number,
    outerDiameterMm: Number,
    outerDiameterInch: Number,
    innerDiameterMm: Number,
    innerDiameterInch: Number,
    gasketOdMm: Number,
    gasketOdInch: Number,
    gasketIdMm: Number,
    gasketIdInch: Number,

    // RENDIMIENTO Y FILTRACIÓN
    isoTestMethod: String,
    micronRating: String,
    betaRatio: String,
    nominalEfficiency: String,
    maxPressurePsi: Number,
    ratedFlowLmin: Number,
    ratedFlowGpm: Number,
    ratedFlowCfm: Number,
    burstPressurePsi: Number,
    collapsePressurePsi: Number,
    bypassValvePressurePsi: String,
    
    // VÁLVULAS Y CARACTERÍSTICAS
    pressureValve: { type: Boolean, default: false },
    antiDrainbackValve: { type: Boolean, default: false },
    specialFeatures: String,

    // CRUCES Y APLICACIONES (DEEP DATA)
    oemCodes: [String],
    crossReferenceCodes: [String],
    equipmentApplications: [String],
    alternativeProducts: [String],
    engineApplications: [String],
    equipmentYear: String,

    // METADATA DE CONTROL
    auditStatus: { type: String, default: "pending" },
    sourceManufacturer: String,
    sourceCode: String
}, {
    timestamps: true,
    collection: 'unified_filters'
});

// Índice compuesto para búsquedas ultra rápidas
unifiedFilterSchema.index({ inputCode: 1, elimfiltersSku: 1 });

module.exports = mongoose.model('UnifiedFilter', unifiedFilterSchema);
