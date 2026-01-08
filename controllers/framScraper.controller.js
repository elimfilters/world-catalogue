const framScraper = require("../services/scrapers/fram.scraper");

module.exports = async function framScraperController(req, res) {
    try {
        const { code } = req.params;
        const result = await framScraper(code);
        if (!result || result.success === false) {
            return res.status(404).json({
                success: false,
                error: "No se pudo scrapear FRAM"
            });
        }
        res.json({
            success: true,
            data: result
        });
    } catch (err) {
        console.error("🔥 Error en FRAM Scraper Controller:", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};
