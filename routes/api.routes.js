const express = require('express');
const router = express.Router();
const scrapeDonaldson = require('../services/scrapers/donaldson.scraper');

router.get('/scraper/donaldson/:sku', async (req, res) => {
    const result = await scrapeDonaldson(req.params.sku);
    res.json(result);
});

// Mantener compatibilidad con tus otros endpoints
router.get('/scrape/:code', (req, res) => res.json({ msg: "Endpoint legacy" }));
router.get('/stats', (req, res) => res.json({ status: "ok" }));

module.exports = router;
