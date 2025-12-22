// ============================================================================
// API — DETECT (v5.0.0)
// - Punto de entrada único
// - No contiene lógica de negocio
// - Normaliza TODAS las respuestas
// ============================================================================

const express = require('express');
const router = express.Router();

const detectionService = require('../services/detectionServiceFinal');
const { normalizeResponse } = require('../services/responseNormalizer');

/**
 * POST /search?mode=partag
 * Body: { partNumber: "XXXX" }
 */
router.post('/search', async (req, res) => {
  const mode = req.query.mode || 'partag';
  const { partNumber } = req.body || {};

  console.log(`🔍 [API] Mode=${mode} | Part=${partNumber}`);

  // ------------------------------------------------------------
  // Validación mínima de entrada
  // ------------------------------------------------------------
  if (!partNumber || typeof partNumber !== 'string' || !partNumber.trim()) {
    return res.status(400).json(
      normalizeResponse({
        status: 'REJECTED',
        source: 'API',
        normalized_query: null,
        reason: 'INVALID_INPUT'
      })
    );
  }

  try {
    const result = await detectionService.detectPartNumber(partNumber.trim());

    // detectionService YA devuelve respuesta normalizada
    return res.status(200).json(result);

  } catch (err) {
    console.error('❌ [API] Fatal error:', err);

    return res.status(500).json(
      normalizeResponse({
        status: 'REJECTED',
        source: 'API',
        normalized_query: partNumber.trim().toUpperCase(),
        reason: 'INTERNAL_SERVER_ERROR'
      })
    );
  }
});

/**
 * GET /health
 */
router.get('/health', (req, res) => {
  return res.status(200).json(
    normalizeResponse({
      status: 'OK',
      source: 'HEALTH',
      normalized_query: null,
      reason: null,
      attributes: {
        service: 'ELIMFILTERS Detection API',
        version: '5.0.0'
      }
    })
  );
});

module.exports = router;
