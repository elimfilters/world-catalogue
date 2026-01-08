const express = require('express');
const router = express.Router();
const donaldsonScraper = require('../services/scrapers/donaldson.scraper');

router.get('/scraper/test/:brand/:code', async (req, res) => {
    try {
        const { brand, code } = req.params;
        console.log(`🧪 Test directo del scraper ${brand} con código ${code}`);

        if (brand.toLowerCase() === 'donaldson') {
            const result = await donaldsonScraper(code);
            return res.json({ success: true, data: result });
        }

        return res.status(400).json({
            success: false,
            error: `Brand ${brand} no soportado en test mode`
        });
    } catch (error) {
        console.error("🔴 Error en test scraper:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
