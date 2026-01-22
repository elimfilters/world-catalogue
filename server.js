const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log('✅ MongoDB v5.0 Connected'))
  .catch(err => console.error('❌ Error:', err));

// --- MATRIZ DE IDENTIDAD ELIMFILTERS v5.0 ---
const TECH_MATRIX = {
    'Oil':       { prefix: 'EL8', tech: 'SYNTRAX™',    color: '#E31E24', media: 'Full Synthetic Micro-Glass' },
    'Air':       { prefix: 'EA1', tech: 'MACROCORE™',  color: '#0055A4', media: 'Nano-Fiber Advanced Media' },
    'Fuel':      { prefix: 'EF9', tech: 'NANOFORCE™',  color: '#FFD700', media: 'Multi-layer Nano-Density Media' },
    'Hydraulic': { prefix: 'EH6', tech: 'SYNTEPORE™',  color: '#4C9141', media: 'High-Pressure Synthetic Mesh' },
    'Cabin':     { prefix: 'EC1', tech: 'MICROKAPPA™', color: '#A9A9A9', media: 'Activated Carbon / HEPA' },
    'Coolant':   { prefix: 'EW7', tech: 'COOLTECH™',   color: '#00AEEF', media: 'Corrosion-Resistant Synthetic' },
    'Fuel Sep':  { prefix: 'ES9', tech: 'AQUAGUARD™',  color: '#003366', media: 'Silicone-Treated Hydrophobic' },
    'Kits HD':   { prefix: 'EK5', tech: 'DURATECH™',   color: '#000000', media: 'Heavy Duty Master Kit Media' }
};

const FilterSchema = new mongoose.Schema({
    originalCode: { type: String, required: true, index: true },
    sku: { type: String, required: true, unique: true },
    technology: String,
    mediaType: String,
    duty: String,
    category: String,
    hexColor: String,
    technicalUrl: String,
    specs: mongoose.Schema.Types.Mixed
}, { timestamps: true });

const Filter = mongoose.model('FilterCache', FilterSchema);

// --- MOTOR GENERATIVO v5.0 ---
const generateSKU = (refCode, category) => {
    const config = TECH_MATRIX[category] || { prefix: 'GEN', tech: 'STANDARD™', color: '#666', media: 'Standard Media' };
    const numbers = refCode.replace(/[^0-9]/g, '');
    const suffix = numbers.slice(-4).padStart(4, '0');
    const sku = ${config.prefix};
    
    return {
        sku,
        tech: config.tech,
        media: ELIMFILTERS  ,
        color: config.color,
        url: https://techtips.elimfilters.com/spec-sheet/
    };
};

// --- ENDPOINT DE BÚSQUEDA EN CASCADA ---
app.get('/api/search/:code', async (req, res) => {
    const inputCode = req.params.code.toUpperCase();
    const category = req.query.cat || 'Oil'; // Por defecto Oil si no se especifica
    
    try {
        // 1. Fase de Consulta Primaria (Cache/DB)
        let filter = await Filter.findOne({ originalCode: inputCode });
        if (filter) return res.json({ source: 'MASTER_CACHE', data: filter });

        // 2. Protocolo Generativo (Regla de los 4 Números)
        const identity = generateSKU(inputCode, category);
        
        // 3. Persistencia (Upsert en MongoDB)
        const newFilter = await Filter.findOneAndUpdate(
            { originalCode: inputCode },
            { 
                sku: identity.sku,
                technology: identity.tech,
                mediaType: identity.media,
                hexColor: identity.color,
                technicalUrl: identity.url,
                category: category,
                duty: 'HD' // Aquí se activaría el Scraper de Donaldson/FRAM
            },
            { upsert: true, new: true }
        );

        res.json({ source: 'GENERATIVE_PROTOCOL_V5', data: newFilter });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(process.env.PORT || 8080, () => console.log('🚀 ELIMFILTERS v5.0 Active'));