const express = require('express');
const router = express.Router();
const classifierService = require('../services/classifier.service');

// POST /api/filters/classify
router.post('/classify', async (req, res) => {
  try {
    const { filterCode, manufacturerHint, searchContext } = req.body;
    
    if (!filterCode) {
      return res.status(400).json({ 
        success: false, 
        error: 'filterCode is required' 
      });
    }

    console.log(`\n📥 Request received: ${filterCode}`);

    const result = await classifierService.processFilter(
      filterCode, 
      manufacturerHint,
      searchContext || 'individual'
    );
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error in /classify:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// POST /api/filters/batch
router.post('/batch', async (req, res) => {
  try {
    const { filterCodes } = req.body;
    
    if (!filterCodes || !Array.isArray(filterCodes)) {
      return res.status(400).json({ 
        success: false, 
        error: 'filterCodes array is required' 
      });
    }

    const results = await classifierService.processBatch(filterCodes);
    res.json({ success: true, results });
  } catch (error) {
    console.error('Error in /batch:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// GET /api/filters/classifications
router.get('/classifications', async (req, res) => {
  try {
    const { manufacturer, filterType, duty } = req.query;
    const query = {};
    
    if (manufacturer) query.manufacturer = manufacturer;
    if (filterType) query.filterType = filterType;
    if (duty) query.duty = duty;

    const classifications = await classifierService.findClassifications(query);
    res.json({ success: true, count: classifications.length, data: classifications });
  } catch (error) {
    console.error('Error in /classifications:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// GET /api/filters/stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await classifierService.getStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error in /stats:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// POST /api/filters/search-sheets
router.post('/search-sheets', async (req, res) => {
  try {
    const { code, context } = req.body;
    
    if (!code) {
      return res.status(400).json({ 
        success: false, 
        error: 'code is required' 
      });
    }

    const googleSheetsService = require('../services/googleSheets.service');
    const result = await googleSheetsService.searchFilter(code, context);
    
    res.json({
      success: !!result,
      result
    });
  } catch (error) {
    console.error('Error in /search-sheets:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;
