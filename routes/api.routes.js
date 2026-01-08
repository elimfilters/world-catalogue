const express = require('express');
const router = express.Router();
const scraperRoutes = require('./scraperRoutes');

// Usar el scraper dinámico de Puppeteer
router.use('/scraper', scraperRoutes);

const saveController = require("../controllers/save.controller");
router.post("/api/save", saveController);
module.exports = router;
