const express = require('express');
const router = express.Router();
const { scrapeFRAM } = require('../services/scrapers/fram.scraper');

// Endpoint individual FRAM
router.get('/fram/:sku', async (req, res) => {
  try {
    const { sku } = req.params;
    const result = await scrapeFRAM(sku);
    res.json(result);
  } catch (error) {
    console.error('FRAM route error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint batch FRAM
router.post('/fram/batch', async (req, res) => {
  try {
    const { codes } = req.body;
    
    if (!codes || !Array.isArray(codes) || codes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'codes array is required'
      });
    }
    
    if (codes.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 10 codes per batch'
      });
    }
    
    const results = [];
    for (const code of codes) {
      const result = await scrapeFRAM(code);
      results.push(result);
    }
    
    res.json({
      success: true,
      totalRequested: codes.length,
      totalSuccess: results.filter(r => r.success).length,
      totalFailed: results.filter(r => !r.success).length,
      results: results
    });
    
  } catch (error) {
    console.error('FRAM batch error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;