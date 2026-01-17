const donaldsonScraper = require('../services/scrapers/donaldson.scraper.http');

// Prefijos oficiales de ELIMFILTERS
const CATEGORIAS = {
    'AIR': 'EA1', 'FUEL': 'EF9', 'OIL': 'EL8', 'HYDRAULIC': 'EH6', 'CABIN': 'EC1'
};

exports.classifyFilter = async (req, res) => {
    try {
        const { filterCode } = req.body;
        if (!filterCode) return res.status(400).json({ error: "filterCode es requerido" });

        console.log(`🔍 Clasificando: ${filterCode}`);
        const data = await donaldsonScraper(filterCode);
        
        let desc = data.descripcion || "";
        let prefix = "EL8"; // Default: Oil

        // LÓGICA DE CONTINGENCIA (Basada en tus 43 explicaciones)
        // Si el código contiene P52 o P53, es AIRE (EA1)
        if (filterCode.toUpperCase().includes("P52") || filterCode.toUpperCase().includes("P53")) {
            prefix = "EA1";
            desc = desc || "FILTRO DE AIRE (DETECCION POR SERIE P52/53)";
        } 
        else if (desc.toUpperCase().includes('AIR')) {
            prefix = 'EA1';
        }
        else if (desc.toUpperCase().includes('FUEL')) {
            prefix = 'EF9';
        }

        // Extraer los últimos 4 dígitos del código Donaldson identificado
        const match = filterCode.match(/P\d{6,7}/i);
        const codeForSku = match ? match[0] : filterCode;
        const lastFour = codeForSku.slice(-4);
        
        const finalSKU = `${prefix}${lastFour}`;

        return res.json({
            originalCode: filterCode,
            elimfiltersSKU: finalSKU,
            descripcion: desc,
            source: desc.includes("DETECCION") ? "emergency_logic_v2" : "bridge_v7"
        });
    } catch (error) {
        console.error("Error en classifyFilter:", error);
        res.status(500).json({ error: error.message });
    }
};
