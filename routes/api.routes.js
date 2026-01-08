const express = require('express');
const router = express.Router();

// ---------- RUTAS EXISTENTES ----------
const saveToMongo = require('../controllers/saveToMongo.controller');
const donaldsonScraperController = require('../controllers/donaldsonScraper.controller');
// ---------- RUTA FRAM ----------
const framScraperController = require('../controllers/framScraper.controller');

router.get('/scraper/save/donaldson/:code', saveToMongo);
router.get('/scraper/test/donaldson/:code', donaldsonScraperController);

// 🚀 Nueva ruta FRAM
router.get('/scraper/test/fram/:code', framScraperController);

module.exports = router;
