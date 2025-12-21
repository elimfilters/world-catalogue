// src/api/alertsMarine.js
const express = require('express');
const router = express.Router();
const { evaluateMarineAlerts } = require('../services/marineAlerts');

// READ-ONLY — no modifica estado
router.get('/alerts/marine', (req, res) => {
  try {
    const report = evaluateMarineAlerts();
    return res.status(200).json({
      success: true,
      data: report,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'MARINE_ALERTS_FAILED',
      message: err.message
    });
  }
});

module.exports = router;
