const express = require('express');
const router = express.Router();
const { scrapeDonaldson } = require('../services/donaldsonScraper');

router.get('/donaldson/:sku', async (req, res) => {
  try {
    const result = await scrapeDonaldson(req.params.sku);
    if (result.success) {
      res.json({ success: true, code: req.params.sku, data: result.data });
    } else {
      res.status(404).json({ success: false, code: req.params.sku, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/donaldson/batch', async (req, res) => {
  try {
    const { codes } = req.body;
    if (!Array.isArray(codes)) {
      return res.status(400).json({ success: false, error: 'codes must be an array' });
    }
    const results = await Promise.allSettled(codes.map(code => scrapeDonaldson(code)));
    const processed = results.map((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        return { code: codes[index], success: true, data: result.value.data };
      } else {
        return { code: codes[index], success: false, error: result.reason?.message || result.value?.error || 'Unknown error' };
      }
    });
    res.json({
      success: true,
      totalRequested: codes.length,
      totalSuccess: processed.filter(r => r.success).length,
      totalFailed: processed.filter(r => !r.success).length,
      results: processed
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
