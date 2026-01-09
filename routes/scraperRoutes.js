const express = require("express");
const router = express.Router();

// EXPORT CORRECTO
const { scrapeDonaldson } = require("../services/scrapers/donaldson.scraper");

// ===============================
// DONALDSON INDIVIDUAL
// ===============================
router.get("/donaldson/:sku", async (req, res) => {
  try {
    const data = await scrapeDonaldson(req.params.sku);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===============================
// DONALDSON BATCH
// ===============================
router.post("/donaldson/batch", async (req, res) => {
  const { codes } = req.body || {};
  if (!Array.isArray(codes) || !codes.length) {
    return res.status(400).json({ success: false, error: "codes array required" });
  }

  const results = [];
  let totalSuccess = 0;
  let totalFailed = 0;

  for (const code of codes.slice(0, 10)) {
    try {
      const data = await scrapeDonaldson(code);
      results.push({ code, success: true, data });
      totalSuccess++;
    } catch (e) {
      results.push({ code, success: false, error: e.message });
      totalFailed++;
    }
  }

  res.json({
    success: true,
    totalRequested: codes.length,
    totalSuccess,
    totalFailed,
    results
  });
});

module.exports = router;
