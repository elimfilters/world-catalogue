const express = require('express');
const router = express.Router();

// Endpoint placeholder
router.get('/:code', (req, res) => {
  res.json({ 
    success: true,
    message: 'Old scrape endpoint',
    code: req.params.code 
  });
});

module.exports = router;