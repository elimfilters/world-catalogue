const express = require('express');
const router = express.Router();

const { isElimfiltersSKU } = require('../utils/isElimfiltersSKU');
const mongo = require('../scrapers/mongoDBScraper');
const { scraperBridge } = require('../scrapers/scraperBridge');

router.get('/', async (req, res) => {
  const q = String(req.query.q || '').trim().toUpperCase();
  if (!q) return res.status(400).json({ success: false, error: 'EMPTY_QUERY' });

  // === BLOQUEO ELIMFILTERS ===
  if (isElimfiltersSKU(q)) {
    const found = await mongo.findBySKU(q);
    if (found) {
      return res.json({ success: true, source: 'ELIMFILTERS', data: found });
    }
    return res.status(404).json({
      success: false,
      error: 'SKU_ELIMFILTERS_NOT_FOUND'
    });
  }

  // === FLUJO NORMAL OEM ===
  const result = await scraperBridge(q);
  if (result) {
    return res.json({ success: true, data: result });
  }

  return res.status(404).json({ success: false, error: 'NOT_FOUND' });
});

module.exports = router;
