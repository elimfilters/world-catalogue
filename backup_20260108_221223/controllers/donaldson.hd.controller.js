const donaldsonHD = require("../services/scrapers/donaldson.hd.scraper");
module.exports = async (req, res) => {
    try {
        const { code } = req.params;
        const data = await donaldsonHD(code);
        if (!data) return res.status(404).json({ success: false, error: "No se encontró Donaldson HD" });
        return res.json({ success: true, data });
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
};
