const express = require('express');
const router = express.Router();
const filterController = require('../controllers/filterController');
router.post('/search', filterController.searchFilter);
router.get('/stats', filterController.getStats);
module.exports = router;
