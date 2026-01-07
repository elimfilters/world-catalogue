const express = require('express');
const router = express.Router();
const mongodbService = require('../services/mongodb.service');
const googleSheetsService = require('../services/googleSheets.service');
const masterScraper = require('../services/scrapers/master.scraper');

router.get('/scrape/:code', async (req, res) => {
    try {
        const { code } = req.params;
        const cleanCode = code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

        // 1. BUSQUEDA EN MONGO (Existente)
        let filter = await mongodbService.findFilterByCode(cleanCode);
        
        // 2. BUSQUEDA EN GOOGLE SHEETS (Existente)
        if (!filter) {
            filter = await googleSheetsService.findFilterInSheets(cleanCode);
        }

        // 3. SI NO EXISTE: ACTIVAR LÓGICA ELIMFILTERS (HD vs LD)
        if (!filter) {
            console.log(`🚀 Código nuevo detectado: ${cleanCode}. Iniciando Master Scraper...`);
            
            // Aquí entra la lógica de Donaldson para HD o Fram para LD
            const scrapedData = await masterScraper.executeFullScrape(cleanCode);

            if (scrapedData && !scrapedData.error) {
                // Si el Scraper encontró info técnica, el servidor responde con el nuevo prospecto
                return res.json({ 
                    success: true, 
                    isNew: true, // Indica a la web que es un SKU por crear
                    data: scrapedData.main_product 
                });
            }

            // Si llegamos aquí, realmente no existe en ninguna fuente
            return res.status(404).json({ 
                success: false, 
                error: "Código no identificado en bases de datos ni fabricantes" 
            });
        }

        // 4. RESPUESTA PARA SKUs YA EXISTENTES
        return res.json({ success: true, isNew: false, data: filter });

    } catch (error) {
        console.error("🔴 Error Crítico en API Railway:", error);
        res.status(500).json({ success: false, error: "Error interno del servidor en producción" });
    }
});

module.exports = router;
