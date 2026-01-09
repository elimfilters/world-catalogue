const express = require('express');
const router = express.Router();
const { generateELIMSKUs } = require('../services/skuGenerator');
const { scrapeDonaldson } = require('../services/scrapers/donaldson.scraper');

router.post('/search', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, error: 'Código requerido' });
    
    console.log(`🔍 Buscando: ${code}`);
    
    const donaldsonData = await scrapeDonaldson(code);
    
    if (!donaldsonData.success) {
      return res.status(404).json({ success: false, error: 'No encontrado' });
    }
    
    const scraperResults = [{
      code: donaldsonData.data.primaryCode || code,
      specifications: donaldsonData.data.specifications || {},
      applications: donaldsonData.data.applications || [],
      crossReferences: donaldsonData.data.crossReferences || []
    }];
    
    const skus = await generateELIMSKUs(code, 'HD', 'Lube', scraperResults);
    
    res.json({
      success: true,
      options: [
        { level: 'STANDARD', ...skus.standard },
        { level: 'PERFORMANCE', ...skus.performance, isDefault: true },
        { level: 'ELITE', ...skus.elite }
      ]
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
