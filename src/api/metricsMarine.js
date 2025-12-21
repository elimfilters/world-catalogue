// src/api/metricsMarine.js
// Endpoint de métricas MARINE (solo lectura)

const express = require('express');
const router = express.Router();

const marineMetrics = require('../services/metricsMarine');

/**
 * GET /metrics/marine
 * Devuelve métricas internas del módulo MARINE
 */
router.get('/metrics/marine', (req, res) => {
  try {
    const snapshot = marineMetrics.snapshot();

    return res.status(200).json({
      success: true,
      scope: 'MARINE',
      data: snapshot,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ [METRICS MARINE] Error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'METRICS_MARINE_ERROR'
    });
  }
});

module.exports = router;
