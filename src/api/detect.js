const express = require('express');
const router = express.Router();

const detectionService = require('../services/detectionServiceFinal');
const normalizeResponse = require('../services/responseNormalizer');

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

    return res.status(400).json(
      normalizeResponse({
        success: false,
        code: 'INVALID_INPUT',
        error: 'Missing or invalid partNumber in request body',
        hint: 'Expected format: { "partNumber": "PH3614" }',
        source: 'detect'
      })
    );
  }

  try {
    const result = await detectionService.detectPartNumber(partNumber.trim());

    console.log(`✅ [API] Success for ${partNumber}`);

    return res.status(200).json(
      normalizeResponse({
        success: true,
        payload: result,
        source: 'detect',
        mode
      })
    );

  } catch (error) {
    console.error(`❌ [API] Error for ${partNumber}:`, error.message);

    const statusCode = error.message?.includes('Invalid') ? 400 : 500;

    return res.status(statusCode).json(
      normalizeResponse({
        success: false,
        code: 'DETECTION_ERROR',
        error: error.message || 'Detection failed',
        source: 'detect',
        partNumber
      })
    );
  }
});

/**
 * GET /health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  return res.status(200).json(
    normalizeResponse({
      success: true,
      payload: {
        status: 'healthy',
        service: 'ELIMFILTERS Detection API',
        version: '5.0.0'
      },
      source: 'health'
    })
  );
});

module.exports = router;
