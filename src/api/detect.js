const { normalizeResponse } = require('../services/responseNormalizer');
const express = require('express');
const router = express.Router();
const detectionService = require('../services/detectionServiceFinal');

/**
 * POST /search?mode=partag
 * Search for part number data
 */
router.post('/search', async (req, res) => {
  const mode = req.query.mode || 'partag';
  const { partNumber } = req.body;

  console.log(`🔍 [API] Incoming request - Mode: ${mode}, Part: ${partNumber}`);

  // Validación de entrada
  if (!partNumber || typeof partNumber !== 'string' || partNumber.trim() === '') {
    console.warn('⚠️ [API] Invalid request: missing or empty partNumber');
    return res.status(400).json({
      success: false,
      error: 'Missing or invalid partNumber in request body',
      hint: 'Expected format: { "partNumber": "PH3614" }'
    });
  }

  try {
    // Llamar al servicio de detección
    const result = await detectionService.detectPartNumber(partNumber.trim());
    
    console.log(`✅ [API] Success for ${partNumber}`);
    
    return res.status(200).json({
      success: true,
      data: result,
      mode: mode,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`❌ [API] Error for ${partNumber}:`, error.message);
    
    // Determinar código de error apropiado
    const statusCode = error.message.includes('Invalid') ? 400 : 500;
    
    return res.status(statusCode).json({
      success: false,
      error: error.message || 'Detection failed',
      partNumber: partNumber,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'ELIMFILTERS Detection API',
    version: '5.0.0',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
