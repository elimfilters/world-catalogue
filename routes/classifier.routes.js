const express = require('express');
const router = express.Router();
const classifier = require('../services/classifier.service');

router.post('/classify', async (req, res) => {
  try {
    const { filterCode, manufacturerHint } = req.body;
    if (!filterCode) {
      return res.status(400).json({ success: false, error: 'filterCode es requerido' });
    }
    const result = await classifier.processFilter(filterCode, manufacturerHint);
    res.json(result);
  } catch (error) {
    console.error('Error clasificando filtro:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/batch', async (req, res) => {
  try {
    const { filterCodes } = req.body;
    if (!Array.isArray(filterCodes) || filterCodes.length === 0) {
      return res.status(400).json({ success: false, error: 'filterCodes debe ser un array no vacío' });
    }
    if (filterCodes.length > 50) {
      return res.status(400).json({ success: false, error: 'Máximo 50 códigos por batch' });
    }
    const results = await classifier.processBatch(filterCodes);
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    res.json({ success: true, total: results.length, successful, failed, results });
  } catch (error) {
    console.error('Error en batch:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/detect/:code', (req, res) => {
  try {
    const { code } = req.params;
    const manufacturer = classifier.detectManufacturer(code);
    if (manufacturer) {
      res.json({ success: true, filterCode: code, manufacturer });
    } else {
      res.json({ success: false, filterCode: code, message: 'Fabricante no detectado en patterns' });
    }
  } catch (error) {
    console.error('Error detectando fabricante:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const stats = await classifier.getStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error obteniendo stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/patterns', (req, res) => {
  try {
    const patterns = classifier.patterns;
    res.json({
      success: true,
      totalManufacturers: patterns.allManufacturers.length,
      industries: Object.keys(patterns.byIndustry),
      breakdown: {
        construction: patterns.construction.manufacturers.length,
        mining: patterns.mining.manufacturers.length,
        agriculture: patterns.agriculture.manufacturers.length,
        transportation: patterns.transportation.manufacturers.length,
        marine: patterns.marine.manufacturers.length,
        powerGeneration: patterns.powerGeneration.manufacturers.length,
        oilGas: patterns.oilGas.manufacturers.length,
        forestry: patterns.forestry.manufacturers.length,
        materialHandling: patterns.materialHandling.manufacturers.length,
        aftermarket: patterns.aftermarket.manufacturers.length,
        lightDuty: patterns.lightDuty.manufacturers.length
      }
    });
  } catch (error) {
    console.error('Error obteniendo patterns:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
