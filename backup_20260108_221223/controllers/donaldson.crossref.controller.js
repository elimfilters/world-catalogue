const donaldsonCrossRefScraper = require("../services/scrapers/donaldson.crossref.scraper");

module.exports = async function donaldsonCrossRefController(req, res) {
    try {
        const { code } = req.params;
        const result = await donaldsonCrossRefScraper(code);
        if (!result) return res.status(404).json({ success: false, error: "No encontrado en Donaldson" });
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
