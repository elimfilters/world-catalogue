const express = require('express');
const router = express.Router();
const { processFilter } = require('../controllers/master.controller');

router.get('/filter/:code', processFilter);

module.exports = router;
