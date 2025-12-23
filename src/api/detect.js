const express = require('express');
const router = express.Router();
const { isElimfiltersSKU } = require('../utils/isElimfiltersSKU');
const mongo = require('../scrapers/mongoDBScraper');
const { scraperBridge } = require('../scrapers/scraperBridge');

// ==========================================
// GET /search?partNumber=XXX (WordPress Legacy)
// ==========================================
router.get('/', async (req, res) => {
  console.log('⚠️ [LEGACY] GET /search - WordPress plugin');
  
  const partNumber = req.query.partNumber || req.query.q || req.query.part;
  
  if (!partNumber) {
    return res.status(400).json({
      success: false,
      error: 'Parámetro requerido: ?partNumber=XXX o ?q=XXX'
    });
  }

  const code = partNumber.trim().toUpperCase();

  try {
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
// POST /search?mode=partag (API v5.0.0)
// ==========================================
router.post('/', async (req, res) => {
  console.log('✅ [MODERN] POST /search - API v5.0.0');
  
  const mode = req.query.mode;
  
  if (mode !== 'partag') {
    return res.status(400).json({
      success: false,
      error: 'mode=partag requerido en query string'
    });
  }

  const { partNumber } = req.body;
  
  if (!partNumber) {
    return res.status(400).json({
      success: false,
      error: 'partNumber requerido en body'
    });
  }

  const code = String(partNumber).trim().toUpperCase();

  try {
    // === BLOQUEO ELIMFILTERS ===
    if (isElimfiltersSKU(code)) {
      const found = await mongo.findBySKU(code);
      if (found) {
        return res.json({ 
          success: true, 
          source: 'ELIMFILTERS', 
          data: found,
          version: '5.0.0'
        });
      }
      return res.status(404).json({
        success: false,
        error: 'SKU_ELIMFILTERS_NOT_FOUND'
      });
    }

    // === FLUJO NORMAL OEM ===
    const result = await scraperBridge(code);
    if (result) {
      return res.json({ 
        success: true, 
        data: result,
        version: '5.0.0'
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
// GET /search/:code (directo por URL)
// ==========================================
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
