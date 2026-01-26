const { getDutyClassification } = require('../services/aiService');

// Renombrado a processSearch para coincidir con routes/filterRoutes.js
const processSearch = async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ error: 'Falta el código del filtro' });

        console.log('🔍 Buscando clasificación para:', query);

        // Llamamos al nuevo AI Service con el noteLLM
        const duty = await getDutyClassification(query);

        res.json({
            codigo: query,
            duty: duty,
            source: 'noteLLM - 262 Catalogos'
        });
    } catch (error) {
        console.error('❌ Error en el controlador:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// IMPORTANTE: Exportar con el mismo nombre que usa el archivo de rutas
module.exports = { processSearch };