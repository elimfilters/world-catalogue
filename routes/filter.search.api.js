const express = require('express');
const router = express.Router();
const { scrapeFRAMAllCodes } = require('../services/scrapers/fram.complete.scraper');
const { searchInSheets } = require('../services/googleSheets.service');
const { searchInMongoDB } = require('../services/mongodb.service');

/**
 * POST /api/filter/search
 * Busca filtro por código OEM o Aftermarket
 * 
 * Body: { "code": "L20195" }
 * Response: { elimfiltersSKU, oemCodes, aftermarketCodes, specs, ... }
 */
router.post('/filter/search', async (req, res) => {
  try {
    const { code } = req.body;
    
    console.log('[API] Buscando:', code);
    
    // 1. Buscar en Google Sheets
    const sheetResult = await searchInSheets(code);
    if (sheetResult?.found) {
      console.log('[API] ✅ Encontrado en Sheets');
      return res.json({ source: 'SHEETS', data: sheetResult });
    }
    
    // 2. Buscar en MongoDB
    const mongoResult = await searchInMongoDB(code);
    if (mongoResult?.found) {
      console.log('[API] ✅ Encontrado en MongoDB');
      return res.json({ source: 'MONGODB', data: mongoResult });
    }
    
    // 3. Scrapear y crear SKU
    console.log('[API] 🔍 Scraping FRAM...');
    const scrapedData = await scrapeFRAMAllCodes(code);
    
    // 4. Guardar en MongoDB (opcional)
    // await saveToMongoDB(scrapedData);
    
    console.log('[API] ✅ SKU creado:', scrapedData.oemCodes[0] || scrapedData.aftermarketCodes[0]);
    
    return res.json({
      source: 'SCRAPED',
      data: scrapedData
    });
    
  } catch (error) {
    console.error('[API] ❌ Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
