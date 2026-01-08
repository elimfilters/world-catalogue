const express = require("express");
const router = express.Router();

const donaldsonCrossRefController = require("../controllers/donaldson.crossref.controller");
const framScraperController = require("../controllers/framScraper.controller");

// Donaldson cross reference
router.get("/api/scraper/donaldson/:code", donaldsonCrossRefController);

// FRAM
router.get("/api/scraper/fram/:code", framScraperController);

// Debug (temporal)
router.get("/api/debug/routes", (req, res) => {
    try {
        const routes = [];
        req.app._router.stack.forEach((m) => {
            if (m.route) {
                const methods = Object.keys(m.route.methods).join(",");
                routes.push({ path: m.route.path, methods });
            }
        });
        res.json({ success: true, routes });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
