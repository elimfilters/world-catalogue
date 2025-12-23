const express = require('express');
const router = express.Router();
const { isElimfiltersSKU } = require('../utils/isElimfiltersSKU');
const mongo = require('../scrapers/mongoDBScraper');
const { scraperBridge } = require('../scrapers/scraperBridge');

console.log('🟢 detect.js cargado correctamente');

// Lazy load para evitar dependencia circular
let sheetsService;
const getSheets = () => {
  if (!sheetsService) {
    sheetsService = require('../services/syncSheetsService');
  }
  return sheetsService;
};

// Helper para guardar en Sheets
async function saveToSheets(result, code) {
  try {
    const { upsertBySku } = getSheets();
    await upsertBySku({
      sku: result.normsku || code,
      query_normalized: code,
      duty: result.duty_type,
      type: result.filter_type || result.type,
      family: result.family,
      attributes: result.attributes || {},
      oem_codes: result.oem_codes,
      cross_reference: result.cross_reference,
      description: result.description,
      source: result.source
    });
    console.log(`✅ Guardado en Sheets: ${result.normsku || code}`);
  } catch (err) {
    console.error('⚠️ Error guardando en Sheets:', err.message);
  }
}

// ==========================================
// GET /search?partNumber=XXX (WordPress)
// ==========================================
router.get('/', async (req, res) => {
  console.log('🟡 GET / ejecutado');
  console.log('Query params:', req.query);
  
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
      await saveToSheets(result, code);
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
  console.log('🔵 POST / EJECUTADO');
  console.log('Body:', req.body);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Query:', req.query);
  
  const { partNumber } = req.body;
  
  if (!partNumber) {
    console.log('❌ partNumber no encontrado en body');
    return res.status(400).json({
      success: false,
      error: 'partNumber requerido en body'
    });
  }

  const code = String(partNumber).trim().toUpperCase();
  console.log('✅ Buscando:', code);

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
      await saveToSheets(result, code);
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
  console.log('🟢 GET /:code ejecutado:', req.params.code);
  
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
    await saveToSheets(result, code);
    return res.json({ success: true, data: result });
  }
  
  return res.status(404).json({ success: false, error: 'NOT_FOUND' });
});

module.exports = router;
