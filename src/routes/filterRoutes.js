const express = require('express');
const router = express.Router();
const filterController = require('../controllers/filterController');

// Ruta principal de búsqueda (Part Number, VIN, Equipment)
router.post('/search', filterController.processSearch);

module.exports = router;
