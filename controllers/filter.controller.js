const donaldsonScraper = require('../services/scrapers/donaldson.scraper.http');

exports.classifyFilter = async (req, res) => {
    try {
        const { filterCode } = req.body;
        // Consultamos al Bridge que ya tiene el "ojo" en el tab de competencia
        const data = await donaldsonScraper(filterCode);
        
        const desc = (data.title || "").toUpperCase();
        const pNumber = (data.partNumber || "").toUpperCase();

        // REGLA ELIMFILTERS: Si es Separador de Agua -> ES9
        let prefix = "EL8"; 
        if (desc.includes("SEPARADOR") || desc.includes("SEPARATOR") || desc.includes("AGUA")) {
            prefix = "ES9";
        } else if (desc.includes("FUEL") || desc.includes("COMBUSTIBLE")) {
            prefix = "EF9";
        }

        // REGLA DE 4 DÍGITOS: P550851 -> 0851
        const lastFour = pNumber.length >= 4 ? pNumber.slice(-4) : "0000";
        const finalSKU = pNumber !== "SIN DATOS" ? `${prefix}${lastFour}` : "NO_ENCONTRADO";

        return res.json({
            SKU: finalSKU,
            referencia_donaldson: pNumber,
            especificacion: desc,
            metodo: "Bridge-Competitor-Tab"
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
