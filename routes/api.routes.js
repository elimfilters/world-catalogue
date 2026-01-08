const express = require('express');
const router = express.Router();
const scraperRoutes = require('./scraperRoutes');

// Usar el scraper dinámico de Puppeteer
router.use('/scraper', scraperRoutes);

module.exports = router;
