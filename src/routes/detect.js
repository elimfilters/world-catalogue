const express = require('express');
const router = express.Router();

const { isElimfiltersSKU } = require('../utils/isElimfiltersSKU');
const mongo = require('../scrapers/mongoDBScraper');
const { scraperBridge } = require('../scrapers/scraperBridge');

router.get('/:code', async (req, res) => {
  const code = String(req.params.code || '').trim().toUpperCase();

  // === BLOQUEO ELIMFILTERS ===
  if (isElimfiltersSKU(code)) {
    const found = await mongo.findBySKU(code);
    if (found) {
      return res.json({ success: true, source: 'ELIMFILTERS', data: found });
    }
    return res.status(404).json({
      success: false,
      error: 'SKU_ELIMFILTERS_NOT_FOUND'
    });
  }

  // === FLUJO NORMAL OEM ===
  const result = await scraperBridge(code);
  if (result) {
    return res.json({ success: true, data: result });
  }

  return res.status(404).json({ success: false, error: 'NOT_FOUND' });
});

module.exports = router;
