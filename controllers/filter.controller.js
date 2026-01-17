const Filter = require('../models/filter.model');
const donaldsonScraper = require('../services/scrapers/donaldson.scraper.http');

// Mapeo de prefijos según tu lista de producción
const PREFIJOS = {
    'LUBE': 'EL8', 'OIL': 'EL8',
    'AIR': 'EA1',
    'FUEL': 'EF9',
    'CABIN': 'EC1',
    'HYDRAULIC': 'EH6',
    'COOLANT': 'EW7',
    'MARINE': 'EM9',
    'TURBINE': 'ET9',
    'AIR_DRYER': 'ED4',
    'FUEL_SEPARATOR': 'ES9',
    'KIT_HD': 'EK5',
    'KIT_LD': 'EK3'
};

exports.classifyFilter = async (req, res) => {
    try {
        const { filterCode } = req.body;
        
        // 1. Buscar en BD/Sheets primero
        let filter = await Filter.findOne({ originalCode: filterCode });
        if (filter && filter.elimfiltersSKU) {
            return res.json({ ...filter._doc, source: "database" });
        }

        // 2. Determinar DUTY (Lógica: HD para códigos tipo Caterpillar/Donaldson)
        const isHD = /^[1-9][A-Z]|^P\d|^[1-9]R/.test(filterCode) || ["CATERPILLAR", "KOMATSU", "MACK"].some(m => filterCode.toUpperCase().includes(m));
        
        console.log(`📡 Iniciando protocolo ${isHD ? 'HD (Donaldson)' : 'LD (FRAM)'} para: ${filterCode}`);

        if (isHD) {
            const data = await donaldsonScraper(filterCode);
            if (!data.error) {
                // Lógica de SKU: Prefijo + últimos 4 dígitos del ID de Donaldson (ej: P551808 -> 1808)
                const lastFour = data.idReal.slice(-4);
                const tipo = data.descripcion.toUpperCase().includes('LUBE') ? 'OIL' : 'AIR'; // Simplificado para prueba
                const sku = `${PREFIJOS[tipo] || 'EL8'}${lastFour}`;

                return res.json({
                    originalCode: filterCode,
                    elimfiltersSKU: sku,
                    descripcion: data.descripcion,
                    manufacturer: "Donaldson",
                    oem_references: data.oem_references,
                    cross_references: data.cross_references,
                    source: "donaldson_protocol_v4"
                });
            }
        }
        
        return res.status(404).json({ message: "No se pudo crear el SKU automáticamente" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
