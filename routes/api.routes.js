const express = require("express");
const router = express.Router();

const donaldsonScraperController = require("../controllers/donaldsonScraper.controller");
const framScraperController = require("../controllers/framScraper.controller");
const saveToMongo = require("../controllers/saveToMongo.controller");

router.get("/scraper/test/donaldson/:code", donaldsonScraperController);
router.get("/scraper/test/fram/:code", framScraperController);
router.get("/scraper/save/donaldson/:code", saveToMongo);

module.exports = router;
