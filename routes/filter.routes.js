const express = require('express');
const router = express.Router();
const classifier = require('../services/classifier.service');
const googleSheetsService = require('../services/googleSheets.service');

router.post('/classify', async (req, res) => {
  try {
    const { filterCode } = req.body;
    
    if (!filterCode) {
      return res.status(400).json({ 
        success: false, 
        error: 'Filter code is required' 
      });
    }

    console.log('[Filter] Request received:', filterCode);

    // PASO 1: Buscar en Google Sheets primero
    console.log('[Sheets] Searching for existing filter:', filterCode);
    const existingFilter = await googleSheetsService.searchFilterByCode(filterCode);
    
    if (existingFilter) {
      console.log('[Sheets] Filter found in database');
      return res.json({
        ...existingFilter,
        source: 'google_sheets_cache'
      });
    }

    console.log('[Sheets] Filter not found, classifying...');

    // PASO 2: No existe, clasificar y scrapear
    const result = await classifier.processFilter(filterCode);

    // PASO 3: Guardar en Google Sheets
    console.log('[Sheets] Saving new filter to database');
    await googleSheetsService.saveFilter(filterCode, result);

    res.json({
      ...result,
      source: 'new_classification'
    });

  } catch (error) {
    console.error('[Error] /classify:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

router.get('/classifications', async (req, res) => {
  try {
    const FilterClassification = require('../models/FilterClassification');
    const results = await FilterClassification.find()
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const FilterClassification = require('../models/FilterClassification');
    const stats = {
      total: await FilterClassification.countDocuments(),
      byDuty: await FilterClassification.aggregate([
        { $group: { _id: '$duty', count: { $sum: 1 } } }
      ])
    };
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
