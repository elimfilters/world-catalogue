const express = require('express');
const router = express.Router();
const filterController = require('../controllers/filter.controller');

router.post('/classify', filterController.classifyFilter);
router.post('/test-full-extraction', filterController.testFullExtraction); // La ruta que faltaba
router.post('/batch', filterController.batchProcess);

module.exports = router;
