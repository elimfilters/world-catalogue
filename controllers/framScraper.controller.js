const framScraper = require("../services/scrapers/fram.scraper");

module.exports = async function framScraperController(req, res) {
    try {
        const { code } = req.params;
        const result = await framScraper(code);
        if (result.error) return res.status(404).json({ success: false, error: result.message });
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
