const donaldsonScraper = require('../services/scrapers/donaldson.scraper.http');

const CATEGORIAS = {
    'AIRE': 'EA1', 'AIR': 'EA1',
    'ACEITE': 'EL8', 'LUBE': 'EL8', 'OIL': 'EL8',
    'COMBUSTIBLE': 'EF9', 'FUEL': 'EF9',
    'HIDRAULICO': 'EH6', 'HYDRAULIC': 'EH6',
    'CABINA': 'EC1', 'CABIN': 'EC1',
    'REFRIGERANTE': 'EW7', 'COOLANT': 'EW7',
    'MARINA': 'EM9', 'MARINE': 'EM9',
    'TURBINA': 'ET9', 'TURBINE': 'ET9',
    'SECADOR': 'ED4', 'DRYER': 'ED4',
    'SEPARADOR': 'ES9', 'SEPARATOR': 'ES9'
};

exports.classifyFilter = async (req, res) => {
    try {
        const { filterCode } = req.body;
        const data = await donaldsonScraper(filterCode);
        
        if (data.error) return res.status(404).json({ error: data.message });

        const desc = data.descripcion;
        let catKey = 'OIL'; // Por defecto Lube/Oil
        
        // Buscamos palabras clave en la descripción para asignar el prefijo correcto
        Object.keys(CATEGORIAS).forEach(key => {
            if (desc.includes(key)) catKey = key;
        });

        const prefix = CATEGORIAS[catKey];
        const lastFour = data.idReal.slice(-4);
        const finalSKU = `${prefix}${lastFour}`;

        return res.json({
            originalCode: filterCode,
            elimfiltersSKU: finalSKU,
            descripcion: desc,
            manufacturer: "Donaldson",
            protocolo: "V5_FULL_HTML",
            categoria_detectada: catKey
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
