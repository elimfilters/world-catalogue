const { getDutyClassification } = require('../services/aiService');

const handleFilterSearch = async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ error: 'Falta el código' });

        console.log('🔍 Procesando:', query);
        
        const duty = await getDutyClassification(query);

        res.json({
            codigo: query,
            duty: duty
        });
    } catch (error) {
        // Aquí está el truco: devolvemos el error real al cliente
        console.error('❌ ERROR CRÍTICO:', error.message);
        res.status(500).json({ 
            error: 'Error en el motor',
            detalle: error.message,
            stack: error.stack.split('\n')[0] // La primera línea del fallo
        });
    }
};

module.exports = { handleFilterSearch };