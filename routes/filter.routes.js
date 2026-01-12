const express = require('express');
const router = express.Router();
const classifierService = require('../services/classifier.service');
const { detectTurbineCode } = require('../src/utils/turbineDetector');
const { getTurbineProduct } = require('../src/services/turbineService');

router.post('/classify', async (req, res) => {
  try {
    const { filterCode, manufacturerHint, searchContext } = req.body;
    if (!filterCode) {
      return res.status(400).json({ success: false, error: 'filterCode is required' });
    }
    console.log('[Filter] Request received:', filterCode);
    
    const turbineCheck = detectTurbineCode(filterCode);
    if (turbineCheck.isTurbine) {
      console.log('[Turbine] Detected:', filterCode, '->', turbineCheck.elimSku);
      const turbineResult = getTurbineProduct(turbineCheck.elimSku, filterCode);
      if (turbineResult.success) {
        return res.json({
          ...turbineResult,
          manufacturer: 'RACOR',
          filterType: 'Turbine',
          duty: 'HD',
          elimfiltersPrefix: 'ET9',
          elimfiltersSKU: turbineResult.product.sku,
          confidence: 'high',
          source: 'turbine_catalog'
        });
      }
    }
    
    const result = await classifierService.processFilter(filterCode, manufacturerHint, searchContext || 'individual');
    res.json(result);
  } catch (error) {
    console.error('[Error] /classify:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/batch', async (req, res) => {
  try {
    const { filterCodes } = req.body;
    if (!filterCodes || !Array.isArray(filterCodes)) {
      return res.status(400).json({ success: false, error: 'filterCodes array is required' });
    }
    
    const results = await Promise.all(filterCodes.map(async (filterCode) => {
      const turbineCheck = detectTurbineCode(filterCode);
      if (turbineCheck.isTurbine) {
        const turbineResult = getTurbineProduct(turbineCheck.elimSku, filterCode);
        if (turbineResult.success) {
          return {
            ...turbineResult,
            manufacturer: 'RACOR',
            filterType: 'Turbine',
            duty: 'HD',
            elimfiltersPrefix: 'ET9',
            elimfiltersSKU: turbineResult.product.sku,
            confidence: 'high',
            source: 'turbine_catalog'
          };
        }
      }
      return await classifierService.processFilter(filterCode);
    }));
    
    res.json({ success: true, results });
  } catch (error) {
    console.error('[Error] /batch:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

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
    console.error('[Error] /classifications:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const stats = await classifierService.getStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('[Error] /stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/search-sheets', async (req, res) => {
  try {
    const { code, context } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, error: 'code is required' });
    }
    const googleSheetsService = require('../services/googleSheets.service');
    const result = await googleSheetsService.searchFilter(code, context);
    res.json({ success: !!result, result });
  } catch (error) {
    console.error('[Error] /search-sheets:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
