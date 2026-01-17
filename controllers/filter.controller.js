const donaldsonScraper = require('../services/scrapers/donaldson.scraper.http');

exports.classifyFilter = async (req, res) => {
    try {
        const { filterCode } = req.body;
        // 1. Abrimos paso en Donaldson
        const techData = await donaldsonScraper(filterCode);
        
        if (techData.error) return res.status(404).json({ error: "No se halló referencia técnica en el tab de competencia" });

        const desc = techData.descripcion.toUpperCase();
        const pNumber = techData.idReal.toUpperCase(); // Aquí debe venir el P550851

        // 2. LÓGICA DE CATEGORÍA (Sin adivinar: leemos la ficha)
        let prefix = "EL8";
        if (desc.includes("SEPARADOR") && (desc.includes("AGUA") || desc.includes("WATER"))) {
            prefix = "ES9"; // Aquaguard™
        } else if (desc.includes("FUEL") || desc.includes("COMBUSTIBLE")) {
            prefix = "EF9"; // Nanoforce™
        }

        // 3. REGLA DE LOS 4 ÚLTIMOS DÍGITOS DEL CÓDIGO DONALDSON
        const lastFour = pNumber.slice(-4);
        const finalSKU = `${prefix}${lastFour}`;

        return res.json({
            SKU: finalSKU,
            referencia_donaldson: pNumber,
            especificacion: desc,
            proceso: "Navegación en Tab de Competencia completada"
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
