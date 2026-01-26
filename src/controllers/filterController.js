const { getDutyClassification } = require('../services/aiService');
const handleFilterSearch = async (req, res) => {
    try {
        const { query } = req.body;
        const duty = await getDutyClassification(query);
        res.json({ codigo: query, duty: duty });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
module.exports = { handleFilterSearch };