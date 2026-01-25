const mongoose = require('mongoose');

const FilterSchema = new mongoose.Schema({
    codigo: { type: String, required: true, index: true },
    sku: { type: String, index: true },
    fabricante: String,
    tipo: String,
    categoria: String,

    // Arrays para búsquedas rápidas
    oem_cross: [String],
    competencia_cross: [String],
    cross_internacional: [String],
    supersede_a: [String],

    // Metadatos
    fecha_actualizacion: Date,
    procesado_por: String,
    fuente_datos: String
}, {
    strict: false, // Permitir campos dinámicos (50 columnas sin definir esquema estricto)
    collection: 'filters',
    timestamps: { createdAt: '_created_at', updatedAt: false }
});

module.exports = mongoose.model('Filter', FilterSchema);
