const express = require('express');
const router = express.Router();
const { isElimfiltersSKU } = require('../utils/isElimfiltersSKU');
const mongo = require('../scrapers/mongoDBScraper');
const { scraperBridge } = require('../scrapers/scraperBridge');

// ==========================================
// GET /search?partNumber=XXX (WordPress)
// ==========================================
router.get('/', async (req, res) => {
  const partNumber = req.query.partNumber || req.query.q || req.query.part;
  
  if (!partNumber) {
    return res.status(400).json({
      success: false,
      error: 'Parámetro requerido: ?partNumber=XXX'
    });
  }

  const code = partNumber.trim().toUpperCase();

  try {
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

    const result = await scraperBridge(code);
    if (result) {
      return res.json({ success: true, data: result });
    }
    
    return res.status(404).json({ success: false, error: 'NOT_FOUND' });
  } catch (error) {
    console.error('Error en GET /search:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error.message
    });
  }
});

// ==========================================
// POST /search (API v5.0.0)
// ==========================================
router.post('/', async (req, res) => {
  const { partNumber } = req.body;
  
  if (!partNumber) {
    return res.status(400).json({
      success: false,
      error: 'partNumber requerido en body'
    });
  }

  const code = String(partNumber).trim().toUpperCase();

  try {
    if (isElimfiltersSKU(code)) {
      const found = await mongo.findBySKU(code);
      if (found) {
        return res.json({ 
          success: true, 
          source: 'ELIMFILTERS', 
          data: found
        });
      }
      return res.status(404).json({
        success: false,
        error: 'SKU_ELIMFILTERS_NOT_FOUND'
      });
    }

    const result = await scraperBridge(code);
    if (result) {
      return res.json({ 
        success: true, 
        data: result
      });
    }
    
    return res.status(404).json({ success: false, error: 'NOT_FOUND' });
  } catch (error) {
    console.error('Error en POST /search:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error.message
    });
  }
});

// ==========================================
// GET /search/:code (URL directa)
// ==========================================
router.get('/:code', async (req, res) => {
  const code = String(req.params.code || '').trim().toUpperCase();
  
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
  
  const result = await scraperBridge(code);
  if (result) {
    return res.json({ success: true, data: result });
  }
  
  return res.status(404).json({ success: false, error: 'NOT_FOUND' });
});

module.exports = router;
