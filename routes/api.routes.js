const express = require('express');
const router = express.Router();
const mongodbService = require('../services/mongodb.service');
const googleSheetsService = require('../services/googleSheets.service');
const masterScraper = require('../services/scrapers/master.scraper');
const donaldsonScraper = require('../services/scrapers/donaldson.scraper');

// RUTA DE TEST PARA SCRAPER (SOLO TESTING)
router.get('/scraper/test/:brand/:code', async (req, res) => {
    try {
        const { brand, code } = req.params;
        console.log(`🧪 Test directo del scraper ${brand} con código ${code}`);
        
        if (brand.toLowerCase() === 'donaldson') {
            const result = await donaldsonScraper(code);
            return res.json(result);
        }
        
        return res.status(400).json({ 
            success: false, 
            error: `Brand ${brand} no soportado en test mode` 
        });
    } catch (error) {
        console.error("🔴 Error en test scraper:", error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// RUTA PRINCIPAL
router.get('/scrape/:code', async (req, res) => {
    try {
        const { code } = req.params;
        const cleanCode = code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        
        let filter = await mongodbService.findFilterByCode(cleanCode);
        
        if (!filter) {
            filter = await googleSheetsService.findFilterInSheets(cleanCode);
        }
        
        if (!filter) {
            console.log(`🚀 Código nuevo detectado: ${cleanCode}. Iniciando Master Scraper...`);
            const scrapedData = await masterScraper.executeFullScrape(cleanCode);
            
            if (scrapedData && !scrapedData.error) {
                return res.json({
                    success: true,
                    isNew: true,
                    data: scrapedData.main_product
                });
            }
            
            return res.status(404).json({
                success: false,
                error: "Código no identificado en bases de datos ni fabricantes"
            });
        }
        
        return res.json({ success: true, isNew: false, data: filter });
    } catch (error) {
        console.error("🔴 Error Crítico en API Railway:", error);
        res.status(500).json({ 
            success: false, 
            error: "Error interno del servidor en producción" 
        });
    }
});

module.exports = router;
