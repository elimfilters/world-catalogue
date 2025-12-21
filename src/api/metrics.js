const express = require('express');
const router = express.Router();
const metricsMarine = require('../services/metricsMarine');

router.get('/metrics/marine', (_req, res) => {
  res.status(200).json(metricsMarine.snapshot());
});

module.exports = router;
