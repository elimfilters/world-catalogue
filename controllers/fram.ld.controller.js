const framLD = require("../services/scrapers/fram.ld.scraper");
module.exports = async (req, res) => {
    try {
        const { code } = req.params;
        const data = await framLD(code);
        if (!data) return res.status(404).json({ success: false, error: "No se encontró FRAM LD" });
        return res.json({ success: true, data });
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
};
