const express = require('express');
const router = express.Router();

const detectionService = require('../services/detectionServiceFinal');
const { normalizeResponse } = require('../services/responseNormalizer');

/**
 * POST /search?mode=partag
 * Search for part number data
 */
router.post('/search', async (req, res) => {
  const mode = req.query.mode || 'partag';
  const { partNumber } = req.body;

  console.log(`🔍 [API] Incoming request - Mode: ${mode}, Part: ${partNumber}`);

  // ================================
  // Validación de entrada
  // ================================
  if (!partNumber || typeof partNumber !== 'string' || partNumber.trim() === '') {
    console.warn('⚠️ [API] Invalid request: missing or empty partNumber');

    return res.status(400).json(
      normalizeResponse({
        status: 'error',
        source: 'api',
        reason: 'INVALID_INPUT',
        normalized_query: partNumber || null
      })
    );
  }

  try {
    // ================================
    // Detección principal
    // ================================
    const result = await detectionService.detectPartNumber(partNumber.trim());

    console.log(`✅ [API] Success for ${partNumber}`);

    return res.status(200).json(
      normalizeResponse({
        status: 'ok',
        source: result?.source || 'unknown',
        sku: result?.sku || null,
        family: result?.family || null,
        duty: result?.duty || null,
        attributes: result?.attributes || {},
        cross: result?.cross || [],
        applications: result?.applications || [],
        normalized_query: partNumber.trim()
      })
    );

  } catch (error) {
    console.error(`❌ [API] Error for ${partNumber}:`, error.message);

    const statusCode = error.message?.includes('Invalid') ? 400 : 500;

    return res.status(statusCode).json(
      normalizeResponse({
        status: 'error',
        source: 'api',
        reason: error.message || 'DETECTION_ERROR',
        normalized_query: partNumber
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
      status: 'ok',
      source: 'health',
      attributes: {
        service: 'ELIMFILTERS Detection API',
        version: '5.0.0'
      }
    })
  );
});

module.exports = router;
