const donaldsonScraper = require('../services/scrapers/donaldson.scraper.http');

exports.classifyFilter = async (req, res) => {
    try {
        const { filterCode } = req.body;
        const match = filterCode.match(/P\d{6,7}/i);
        const pNumber = match ? match[0].toUpperCase() : filterCode.toUpperCase();
        
        // 1. DETERMINACIÓN POR ESPECIFICACIONES TÉCNICAS (Series Donaldson)
        let prefix = "EL8"; // Default (Lube)
        let categoria = "OIL";
        let razon = "Clasificación estándar por defecto";

        // Lógica de Aire (EA1): Series P52/P53/P60 diseñadas para flujo de aire HD
        if (pNumber.startsWith("P52") || pNumber.startsWith("P53") || pNumber.startsWith("P60")) {
            prefix = "EA1";
            categoria = "AIR";
            razon = "Especificación Técnica: Filtración de Aire Heavy Duty (HD)";
        }
        // Lógica de Combustible (EF9): Series P55 diseñadas para micraje de combustible
        else if (pNumber.startsWith("P55") && (filterCode.includes("FUEL") || filterCode.includes("COMBUSTIBLE"))) {
            prefix = "EF9";
            categoria = "FUEL";
            razon = "Especificación Técnica: Filtración de Combustible";
        }

        const lastFour = pNumber.slice(-4);
        const finalSKU = `${prefix}${lastFour}`;

        return res.json({
            originalCode: filterCode,
            elimfiltersSKU: finalSKU,
            especificacion: razon,
            manufacturer_context: "HD Engine / Equipment Application",
            source: "technical_specs_v1"
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
