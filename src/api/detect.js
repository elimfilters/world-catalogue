const express = require('express');
const router = express.Router();
const { isElimfiltersSKU } = require('../utils/isElimfiltersSKU');
const mongo = require('../scrapers/mongoDBScraper');
const { scraperBridge } = require('../scrapers/scraperBridge');
const { generateSKU } = require('../sku/generator');
const { extract4Digits } = require('../utils/digitExtractor');

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

// Helper para generar SKU cuando no se encuentra en scrapers
async function generateAndSaveNewSKU(code) {
  try {
    console.log(`🔧 Generando nuevo SKU para: ${code}`);
    
    // Extraer últimos 4 dígitos
    const last4 = extract4Digits(code);
    if (!last4) {
      console.log(`❌ No se pudieron extraer 4 dígitos de: ${code}`);
      return null;
    }
    
    // Por defecto, asumimos AIR/LD si no tenemos más info
    // Puedes ajustar esta lógica según tus reglas de negocio
    const family = 'AIR';
    const duty = 'LD';
    
    const skuResult = generateSKU(family, duty, last4, { rawCode: code });
    
    if (skuResult.error) {
      console.log(`❌ Error generando SKU: ${skuResult.error}`);
      return null;
    }
    
    const newSKU = skuResult;
    console.log(`✅ SKU generado: ${newSKU}`);
    
    // Crear objeto de resultado
    const result = {
      normsku: newSKU,
      query_normalized: code,
      duty_type: duty,
      filter_type: family,
      family: family,
      attributes: {},
      oem_codes: [code],
      cross_reference: [code],
      description: `Auto-generated SKU for ${code}`,
      source: 'AUTO_GENERATED'
    };
    
    // Guardar en Sheets
    await saveToSheets(result, code);
    
    // Opcionalmente, guardar en MongoDB también
    // await mongo.insertOne(result);
    
    return result;
    
  } catch (error) {
    console.error('❌ Error en generateAndSaveNewSKU:', error);
    return null;
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
    // 1. Si es SKU ELIMFILTERS, buscar en MongoDB
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

    // 2. Buscar en scrapers externos
    const result = await scraperBridge(code);
    if (result) {
      await saveToSheets(result, code);
      return res.json({ success: true, data: result });
    }
    
    // 3. SI NO ENCUENTRA: Generar nuevo SKU
    console.log(`⚠️ No encontrado en scrapers, generando SKU para: ${code}`);
    const newResult = await generateAndSaveNewSKU(code);
    
    if (newResult) {
      return res.json({ 
        success: true, 
        generated: true,
        data: newResult 
      });
    }
    
    // 4. Si todo falla, devolver NOT_FOUND
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
    // 1. Si es SKU ELIMFILTERS, buscar en MongoDB
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

    // 2. Buscar en scrapers externos
    const result = await scraperBridge(code);
    if (result) {
      await saveToSheets(result, code);
      return res.json({ 
        success: true, 
        data: result
      });
    }
    
    // 3. SI NO ENCUENTRA: Generar nuevo SKU
    console.log(`⚠️ No encontrado en scrapers, generando SKU para: ${code}`);
    const newResult = await generateAndSaveNewSKU(code);
    
    if (newResult) {
      return res.json({ 
        success: true, 
        generated: true,
        data: newResult 
      });
    }
    
    // 4. Si todo falla, devolver NOT_FOUND
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
  
  // 1. Si es SKU ELIMFILTERS
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
  
  // 2. Buscar en scrapers
  const result = await scraperBridge(code);
  if (result) {
    await saveToSheets(result, code);
    return res.json({ success: true, data: result });
  }
  
  // 3. Generar nuevo SKU
  console.log(`⚠️ No encontrado en scrapers, generando SKU para: ${code}`);
  const newResult = await generateAndSaveNewSKU(code);
  
  if (newResult) {
    return res.json({ 
      success: true, 
      generated: true,
      data: newResult 
    });
  }
  
  // 4. NOT_FOUND
  return res.status(404).json({ success: false, error: 'NOT_FOUND' });
});

module.exports = router;