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
    console.log('[Sheets] Searching for existing filter:', filterCode);
    const existingFilter = await googleSheetsService.searchInSheets(filterCode);
    
    if (existingFilter) {
      console.log('[Sheets] Filter found in database');
      return res.json({
        ...existingFilter,
        source: 'google_sheets_cache'
      });
    }

    console.log('[Sheets] Filter not found, classifying...');
    const result = await classifier.processFilter(filterCode);
    
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

router.post('/search-sheets', async (req, res) => {
  try {
    const { filterName } = req.body;
    
    if (!filterName) {
      return res.status(400).json({
        success: false,
        error: 'filterName is required'
      });
    }

    console.log('[Sheets] Searching for filter:', filterName);
    const result = await googleSheetsService.searchInSheets(filterName);
    
    if (result) {
      console.log('[Sheets] Filter found');
      return res.json({
        success: true,
        data: result,
        source: 'google_sheets'
      });
    } else {
      console.log('[Sheets] Filter not found');
      return res.status(404).json({
        success: false,
        error: 'Filter not found in Google Sheets',
        filterName
      });
    }
  } catch (error) {
    console.error('[Error] /search-sheets:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/batch', async (req, res) => {
  try {
    const { filters } = req.body;
    
    if (!filters || !Array.isArray(filters) || filters.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'filters array is required'
      });
    }

    console.log("[Batch] Processing ${filters.length} filters");
    const results = [];
    
    for (const filterCode of filters) {
      try {
        let result = await googleSheetsService.searchInSheets(filterCode);
        
        if (result) {
          results.push({
            filterCode,
            success: true,
            data: result,
            source: 'google_sheets_cache'
          });
        } else {
          const classified = await classifier.processFilter(filterCode);
          await googleSheetsService.saveFilter(filterCode, classified);
          
          results.push({
            filterCode,
            success: true,
            data: classified,
            source: 'new_classification'
          });
        }
      } catch (error) {
        results.push({
          filterCode,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      total: filters.length,
      processed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    });
  } catch (error) {
    console.error('[Error] /batch:', error);
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


router.delete('/cache/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const FilterClassification = require('../models/FilterClassification');
    
    const result = await FilterClassification.deleteMany({ 
      originalCode: { $regex: new RegExp(`^${code}const express = require('express');
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
    console.log('[Sheets] Searching for existing filter:', filterCode);
    const existingFilter = await googleSheetsService.searchInSheets(filterCode);
    
    if (existingFilter) {
      console.log('[Sheets] Filter found in database');
      return res.json({
        ...existingFilter,
        source: 'google_sheets_cache'
      });
    }

    console.log('[Sheets] Filter not found, classifying...');
    const result = await classifier.processFilter(filterCode);
    
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

router.post('/search-sheets', async (req, res) => {
  try {
    const { filterName } = req.body;
    
    if (!filterName) {
      return res.status(400).json({
        success: false,
        error: 'filterName is required'
      });
    }

    console.log('[Sheets] Searching for filter:', filterName);
    const result = await googleSheetsService.searchInSheets(filterName);
    
    if (result) {
      console.log('[Sheets] Filter found');
      return res.json({
        success: true,
        data: result,
        source: 'google_sheets'
      });
    } else {
      console.log('[Sheets] Filter not found');
      return res.status(404).json({
        success: false,
        error: 'Filter not found in Google Sheets',
        filterName
      });
    }
  } catch (error) {
    console.error('[Error] /search-sheets:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/batch', async (req, res) => {
  try {
    const { filters } = req.body;
    
    if (!filters || !Array.isArray(filters) || filters.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'filters array is required'
      });
    }

    console.log("[Batch] Processing ${filters.length} filters");
    const results = [];
    
    for (const filterCode of filters) {
      try {
        let result = await googleSheetsService.searchInSheets(filterCode);
        
        if (result) {
          results.push({
            filterCode,
            success: true,
            data: result,
            source: 'google_sheets_cache'
          });
        } else {
          const classified = await classifier.processFilter(filterCode);
          await googleSheetsService.saveFilter(filterCode, classified);
          
          results.push({
            filterCode,
            success: true,
            data: classified,
            source: 'new_classification'
          });
        }
      } catch (error) {
        results.push({
          filterCode,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      total: filters.length,
      processed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    });
  } catch (error) {
    console.error('[Error] /batch:', error);
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

, 'i') }
    });
    
    res.json({
      success: true,
      deleted: result.deletedCount,
      code: code
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;


