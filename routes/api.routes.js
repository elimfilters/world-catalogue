const express = require('express');
const router = express.Router();
const saveToMongo = require('../controllers/saveToMongo.controller');

// NUEVA RUTA: Guarda producto o kit desde código Donaldson
router.get('/scraper/save/donaldson/:code', saveToMongo);

module.exports = router;
