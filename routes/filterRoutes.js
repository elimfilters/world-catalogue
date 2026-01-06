// ============================================
// ROUTES/filterRoutes.js
// ============================================
const express = require('express');
const router = express.Router();
const filterController = require('../controllers/filterController');

// Búsqueda por código (POST)
router.post('/search', filterController.searchFilter);

// Búsqueda por código (GET)
router.get('/search/:code', filterController.searchFilterByCode);

// Cross references
router.get('/cross-references/:code', filterController.getCrossReferences);

// CRUD de filtros
router.post('/filters', filterController.createFilter);
router.get('/filters', filterController.getAllFilters);
router.get('/filters/:sku', filterController.getFilterBySKU);
router.put('/filters/:sku', filterController.updateFilter);
router.delete('/filters/:sku', filterController.deleteFilter);

// Búsqueda avanzada
router.post('/filters/advanced-search', filterController.advancedSearch);

// Estadísticas
router.get('/stats', filterController.getStats);

module.exports = router;
