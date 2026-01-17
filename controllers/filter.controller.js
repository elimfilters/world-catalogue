const donaldsonScraper = require('../services/scrapers/donaldson.scraper.http');

const CATEGORIAS_PROD = {
    'AIR': 'EA1', 'FUEL': 'EF9', 'CABIN': 'EC1', 'HYDRAULIC': 'EH6',
    'OIL': 'EL8', 'LUBE': 'EL8', 'COOLANT': 'EW7', 'MARINE': 'EM9',
    'TURBINE': 'ET9', 'AIR_DRYER': 'ED4', 'SEPARATOR': 'ES9',
    'KIT_HD': 'EK5', 'KIT_LD': 'EK3'
};

exports.classifyFilter = async (req, res) => {
    try {
        const { filterCode } = req.body;
        
        // Protocolo de extracción HD (Donaldson)
        const data = await donaldsonScraper(filterCode);
        
        if (data.error) return res.status(404).json({ error: data.message });

        // Lógica de detección de categoría por descripción
        const desc = data.descripcion.toUpperCase();
        let cat = 'OIL'; // Default
        if (desc.includes('AIR') || desc.includes('AIRE')) cat = 'AIR';
        else if (desc.includes('FUEL') || desc.includes('COMBUSTIBLE')) cat = 'FUEL';
        else if (desc.includes('HYDRAULIC') || desc.includes('HIDRAULICO')) cat = 'HYDRAULIC';
        else if (desc.includes('CABIN') || desc.includes('CABINA')) cat = 'CABIN';
        else if (desc.includes('COOLANT') || desc.includes('REFRIGERANTE')) cat = 'COOLANT';
        else if (desc.includes('SEPARATOR')) cat = 'SEPARATOR';

        const prefix = CATEGORIAS_PROD[cat];
        const lastFour = data.idReal.slice(-4);
        const finalSKU = `${prefix}${lastFour}`;

        return res.json({
            originalCode: filterCode,
            elimfiltersSKU: finalSKU,
            descripcion: data.descripcion,
            manufacturer: "Donaldson",
            tipo_detectado: cat,
            source: "protocolo_automatico_v5"
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
