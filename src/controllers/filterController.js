const knowledge = require('../services/knowledgeService');
const donaldson = require('../scrapers/donaldsonScraper');
const skuServ = require('../services/skuService');
const mapper = require('../services/mapperService');
const Filter = require('../models/Filter');

exports.handleSearch = async (req, res) => {
    const input = req.body.query.toUpperCase().trim();
    console.log(`\n--- Nueva Consulta: ${input} ---`);

    try {
        // 1. PRIORIDAD: Catálogos locales (Híbrido)
        const local = knowledge.searchLocal(input);
        if (local) {
            return res.json({ source: 'PDF_CATALOG', data: local });
        }

        // 2. SCRAPER REAL
        const raw = await donaldson.runDonaldsonFull(input);
        if (raw) {
            const sku = skuServ.generateElimSKU(raw.category, raw.partNumber);
            const mapped = mapper.mapToSheet(raw, sku, 'HD', input);
            
            // Guardar en Atlas para que ya no sea "nuevo"
            const record = await Filter.create({ ...mapped, sku, part_number: input });
            return res.json({ source: 'NEW_SCRAPE', data: record });
        }

        res.status(404).json({ error: "No se encontró información." });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};