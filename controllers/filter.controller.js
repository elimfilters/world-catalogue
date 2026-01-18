const donaldsonScraper = require('../services/scrapers/donaldson.scraper.api');
const googleSheetsService = require('../services/googleSheets.service');

exports.classifyFilter = async (req, res) => { /* ... lógica existente ... */ };

// ESTA ES LA FUNCIÓN QUE NECESITAMOS
exports.testFullExtraction = async (req, res) => {
    try {
        const { filterCode, cleanNames, updateSheet } = req.body;
        const data = await donaldsonScraper(filterCode);
        
        if (data.error) return res.status(404).json(data);

        // Lógica de limpieza de nombres en Cross Reference
        const cleanXref = data.referenciaCruzada.map(ref => {
            return ref.part_number.replace(/[a-zA-Z]+\s/g, '').trim();
        }).join(', ');

        const sku = (data.filterType === 'FUEL SEPARATOR' ? 'ES9' : 'EL8') + data.idReal.slice(-4);

        if (updateSheet) {
            await googleSheetsService.updateFilterRow(filterCode, {
                sku: sku,
                thread: data.especificaciones['Tamaño de la rosca'] || '',
                crossRef: cleanXref,
                specs: data.especificaciones
            });
        }

        res.json({
            SKU: sku,
            threadSize: data.especificaciones['Tamaño de la rosca'],
            cleanCrossReferences: cleanXref,
            sheetUpdateStatus: updateSheet ? "Actualizado con éxito" : "No solicitado"
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.batchProcess = async (req, res) => { /* ... */ };
