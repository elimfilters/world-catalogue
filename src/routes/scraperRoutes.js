const express = require('express');
const router = express.Router();
const { scrapeDonaldson } = require('../services/donaldsonScraper');
const { detectTurbineCode } = require('../utils/turbineDetector');
const { getTurbineProduct } = require('../services/turbineService');

router.get('/donaldson/:sku', async (req, res) => {
  try {
    const code = req.params.sku;
    
    // Detectar si es turbina ANTES de scrapear
    const turbineCheck = detectTurbineCode(code);
    if (turbineCheck.isTurbine) {
      const turbineResult = getTurbineProduct(turbineCheck.elimSku, code);
      if (turbineResult.success) {
        return res.json({ 
          success: true, 
          code: code, 
          source: 'turbine_catalog',
          data: turbineResult 
        });
      }
    }
    
    // Si NO es turbina, scrapear Donaldson normal
    const result = await scrapeDonaldson(code);
    if (result.success) {
      res.json({ 
        success: true, 
        code: code, 
        source: 'donaldson_scraper',
        data: result.data 
      });
    } else {
      res.status(404).json({ success: false, code: code, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/donaldson/batch', async (req, res) => {
  try {
    const { codes } = req.body;
    if (!Array.isArray(codes)) {
      return res.status(400).json({ success: false, error: 'codes must be an array' });
    }
    
    const results = await Promise.allSettled(codes.map(async (code) => {
      // Detectar turbina para cada código
      const turbineCheck = detectTurbineCode(code);
      if (turbineCheck.isTurbine) {
        const turbineResult = getTurbineProduct(turbineCheck.elimSku, code);
        if (turbineResult.success) {
          return { success: true, source: 'turbine_catalog', data: turbineResult };
        }
      }
      
      // Si NO es turbina, scrapear
      return await scrapeDonaldson(code);
    }));
    
    const processed = results.map((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        return { 
          code: codes[index], 
          success: true, 
          source: result.value.source || 'donaldson_scraper',
          data: result.value.data 
        };
      } else {
        return { 
          code: codes[index], 
          success: false, 
          error: result.reason?.message || result.value?.error || 'Unknown error' 
        };
      }
    });
    
    res.json({
      success: true,
      totalRequested: codes.length,
      totalSuccess: processed.filter(r => r.success).length,
      totalFailed: processed.filter(r => !r.success).length,
      results: processed
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
