const express = require('express');
const router = express.Router();
const { processFilterRequest } = require('../services/filter.orchestrator');

router.get('/filter/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const result = await processFilterRequest(code);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;