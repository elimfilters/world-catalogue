const donaldsonScraper = require('../services/scrapers/donaldson.scraper.http');

const CATEGORIAS = {
    'AIR': 'EA1', 'FUEL': 'EF9', 'OIL': 'EL8', 'HYDRAULIC': 'EH6', 'CABIN': 'EC1'
};

exports.classifyFilter = async (req, res) => {
    try {
        const { filterCode } = req.body;
        const data = await donaldsonScraper(filterCode);
        
        let desc = data.descripcion || "";
        let finalSKU = "";
        let prefix = "EL8"; // Default

        // LÓGICA DE EMERGENCIA: Si el scraper falló (descripción vacía)
        if (!desc || desc === "") {
            // Si el código contiene P52 (Serie común de aire en Donaldson)
            if (filterCode.includes("P52") || filterCode.includes("P53")) {
                prefix = "EA1";
                desc = "FILTRO DE AIRE (DETECCION POR PATRON)";
            }
        } else {
            // Lógica normal por descripción
            if (desc.includes('AIR')) prefix = 'EA1';
            else if (desc.includes('FUEL')) prefix = 'EF9';
        }

        const match = filterCode.match(/P\d{6,7}/i);
        const codeDigits = match ? match[0].slice(-4) : filterCode.slice(-4);
        finalSKU = `${prefix}${codeDigits}`;

        return res.json({
            originalCode: filterCode,
            elimfiltersSKU: finalSKU,
            descripcion: desc,
            source: desc.includes("PATRON") ? "emergency_logic_v1" : "bridge_v7"
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
