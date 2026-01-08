const donaldsonCrossReference = require("../services/scrapers/donaldson.crossref.scraper");

module.exports = async (req, res) => {
    try {
        const { code } = req.params;
        const result = await donaldsonCrossReference(code);

        if (!result) {
            return res.status(404).json({ success: false, error: "No encontrado en Donaldson" });
        }

        res.json({ success: true, data: result });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};
