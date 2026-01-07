const express = require("express");
const router = express.Router();
const scrapers = require("../services/scrapers");
const classificationService = require("../services/classification.service");
const ScrapedFilter = require("../models/ScrapedFilter");

router.get("/scrape/:code", async (req, res) => {
  try {
    const { code } = req.params;
    console.log(`🎯 Scraping: ${code}`);
    
    const scrapedData = await scrapers.scrape(code);
    
    if (!scrapedData.success) {
      return res.status(404).json({ success: false, error: "Código no encontrado" });
    }
    
    const classified = classificationService.classifyFilter(scrapedData.main_product);
    
    res.json({
      success: true,
      data: classified
    });
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
