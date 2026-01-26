const { getDutyClassification } = require('../services/aiService');

const handleFilterSearch = async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ error: 'Falta el código' });
        
        const duty = await getDutyClassification(query);
        res.json({ codigo: query, duty: duty });
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ error: error.message });
    }
};

// Exportación explícita
module.exports = { handleFilterSearch };