const express = require('express');
const router = express.Router();
const scrapeDonaldson = require('../services/scrapers/donaldson.scraper');

router.get('/scraper/donaldson/:sku', async (req, res) => {
    const result = await scrapeDonaldson(req.params.sku);
    res.json(result);
});

module.exports = router;
