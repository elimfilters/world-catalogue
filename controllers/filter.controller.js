const donaldsonScraper = require('../services/scrapers/donaldson.scraper.http');
// Aquí se importaría el scraper de FRAM cuando esté listo
// const framScraper = require('../services/scrapers/fram.scraper.http');

exports.classifyFilter = async (req, res) => {
    try {
        const { filterCode, duty = 'HD' } = req.body; // Por defecto HD si no se envía
        let techData;
        let sourceBrand = "";

        // 1. DETERMINACIÓN DE FUENTE POR DUTY (Especificación Técnica)
        if (duty === 'HD') {
            techData = await donaldsonScraper(filterCode);
            sourceBrand = "DONALDSON";
        } else {
            // Lógica para FRAM (LD)
            // techData = await framScraper(filterCode);
            sourceBrand = "FRAM";
            return res.json({ message: "Protocolo FRAM LD en desarrollo" });
        }

        if (techData.error) return res.status(404).json({ error: `No se halló cross en ${sourceBrand}` });

        const refCode = techData.idReal.toUpperCase();
        const desc = techData.descripcion.toUpperCase();

        // 2. ASIGNACIÓN DE PREFIJO ELIMFILTERS (Categorías en Producción)
        let prefix = "EL8"; // Default Syntrax™
        if (desc.includes("AIRE") || desc.includes("AIR")) prefix = "EA1"; // Macrocore™
        else if (desc.includes("FUEL") || desc.includes("COMBUSTIBLE")) prefix = "EF9"; // Nanoforce™
        else if (desc.includes("CABIN") || desc.includes("CABINA")) prefix = "EC1"; // Microkappa™
        else if (desc.includes("HYDRAULIC") || desc.includes("HIDRAULICO")) prefix = "EH6"; // Syntepore™

        // 3. REGLA DE ORO: Prefijo + Últimos 4 dígitos del código obtenido
        const lastFour = refCode.slice(-4);
        const finalSKU = `${prefix}${lastFour}`;

        return res.json({
            SKU: finalSKU,
            especificacion: desc,
            cross_reference: refCode,
            duty: duty,
            source: sourceBrand
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
