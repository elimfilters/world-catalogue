const express = require("express");
const router = express.Router();

const donaldsonHDController = require("../controllers/donaldson.hd.controller");
const framLDController = require("../controllers/fram.ld.controller");

// HD scraper
router.get("/api/scraper/donaldson/:code", donaldsonHDController);

// LD scraper
router.get("/api/scraper/fram/:code", framLDController);

module.exports = router;
