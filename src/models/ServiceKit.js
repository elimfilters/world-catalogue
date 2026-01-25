const mongoose = require('mongoose');

const serviceKitSchema = new mongoose.Schema({
    kit_sku: { type: String, required: true, unique: true }, // Ejemplo: EK50320
    kit_type: { type: String, default: "Maintenance Kit" },
    kit_series: { type: String, default: "DURATECH™" },
    kit_description_en: { type: String, required: true },
    filters_included: { type: [String], required: true }, // Lista de SKUs internos
    equipment_applications: [String],
    engine_applications: [String],
    industry_segment: String,
    warranty_months: { type: Number, default: 12 },
    change_interval_km: { type: Number, default: 0 },
    change_interval_hours: { type: Number, default: 0 },
    norm: { type: String, default: "ISO 4548 / ISO 5011" },
    sku_base: { type: String, required: true }, // Los 4 números base
    oem_kit_reference: [String],
    product_image_url: String,
    url_technical_sheet_pdf: String,
    stock_status: { type: String, default: "In Stock" },
    audit_status: { type: String, default: "VALIDATED_KIT" },
    created_at: { type: Date, default: Date.now },
    created_by: { type: String, default: "Elimfilters_AI" }
}, {
    timestamps: true, // Crea automáticamente updatedAt y createdAt
    collection: 'service_kits'
});

module.exports = mongoose.model('ServiceKit', serviceKitSchema);
