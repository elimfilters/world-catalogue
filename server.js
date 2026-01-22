const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// Esquema Completo ELIMFILTERS (42 columnas)
const FilterSchema = new mongoose.Schema({
  originalCode: { type: String, required: true, index: true },
  sku: { type: String, required: true, unique: true },
  description: String,
  filterType: String,
  technology: String,
  threadSize: String,
  dimensions: { height_mm: Number, outerDiameter_mm: Number },
  performance: { micronRating: String, nominalEfficiency: String },
  pressure: { max_psi: Number, bypassValve_psi: Number },
  // ... (los demás campos se guardan en el objeto 'extraData' para flexibilidad)
  extraData: mongoose.Schema.Types.Mixed 
}, { timestamps: true });

const Filter = mongoose.model('Filter', FilterSchema);

// --- LÓGICA POR SOLICITUD DE CÓDIGO ---
app.get('/api/search/:code', async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    // 1. Buscar en la base de datos
    let filter = await Filter.findOne({ originalCode: code });
    
    if (filter) {
      return res.json({ source: 'database', data: filter });
    }

    // 2. Si no existe, aplicar lógica del Motor Real (Transformación en tiempo real)
    // Ejemplo: P553000 -> EL83000
    const prefix = "EL";
    const numericPart = code.replace(/\D/g, ''); 
    const generatedSKU = prefix + (numericPart || "00000");

    res.json({
      source: 'logic_engine',
      message: 'Código no encontrado en DB, generado por motor',
      data: {
        originalCode: code,
        sku: generatedSKU,
        status: 'pending_technical_data'
      }
    });

  } catch (error) {
    res.status(500).json({ error: 'Error en la solicitud' });
  }
});

app.listen(process.env.PORT || 8080, () => console.log('🚀 Motor ELIMFILTERS Solicitudes Activo'));