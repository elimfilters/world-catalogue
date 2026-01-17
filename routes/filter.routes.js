const express = require('express');
const router = express.Router();
const filterController = require('../controllers/filter.controller');

// Definición limpia de la ruta
router.post('/classify', filterController.classifyFilter);

module.exports = router;
