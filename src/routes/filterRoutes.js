const express = require('express');
const router = express.Router();
const controller = require('../controllers/filterController');

// Verificación de seguridad antes de asignar la ruta
if (controller && controller.handleFilterSearch) {
    router.post('/search', controller.handleFilterSearch);
} else {
    console.error('❌ ERROR: La función handleFilterSearch no está definida en el controlador.');
}

module.exports = router;