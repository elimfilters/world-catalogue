const framScraper = require("../services/scrapers/fram.scraper");
module.exports = async (req, res) => {
    try {
        const { code } = req.params;
        const result = await framScraper(code);
        if (result.error) return res.status(404).json({ success: false, error: result.message });
        return res.json({ success: true, data: result });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};
