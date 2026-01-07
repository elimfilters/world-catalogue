const express = require('express');
const router = express.Router();
const mongodbService = require('../services/mongodb.service');
const googleSheetsService = require('../services/googleSheets.service');
const masterScraper = require('../services/scrapers/master.scraper');

router.get('/scrape/:code', async (req, res) => {
    try {
        const { code } = req.params;
        const cleanCode = code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

        // 1. Intentar buscar en DB Local primero
        let filter = await mongodbService.findFilterByCode(cleanCode);
        
        // 2. Si no está en DB, buscar en Google Sheets
        if (!filter) {
            filter = await googleSheetsService.findFilterInSheets(cleanCode);
        }

        // 3. SI NO EXISTE EN NINGÚN LADO (Aquí estaba el error)
        if (!filter) {
            console.log(`🚀 Código ${cleanCode} nuevo. Iniciando proceso de asignación HD/LD...`);
            
            // Llamamos al masterScraper que ya tiene la lógica de Donaldson (HD) y Fram (LD)
            const scrapedData = await masterScraper.executeFullScrape(cleanCode);

            if (scrapedData && !scrapedData.error) {
                return res.json({ 
                    success: true, 
                    isNew: true,
                    data: scrapedData.main_product 
                });
            }

            // Si el scraper tampoco lo encuentra en ninguna marca
            return res.status(404).json({ 
                success: false, 
                error: "Código no encontrado en ninguna fuente (DB, Sheets o Fabricantes)" 
            });
        }

        // 4. Si se encontró en DB o Sheets, devolver normal
        return res.json({ success: true, isNew: false, data: filter });

    } catch (error) {
        console.error("🔴 Error en ruta api/scrape:", error);
        res.status(500).json({ success: false, error: "Error interno del servidor" });
    }
});

module.exports = router;
