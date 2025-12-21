const express = require('express');
const router = express.Router();
const metricsKits = require('../services/metricsKits');

router.get('/metrics/kits', (_req,res)=>res.status(200).json(metricsKits.snapshot()));
module.exports = router;
