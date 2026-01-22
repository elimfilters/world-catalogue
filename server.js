const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URL).then(() => console.log('✅ v5.01 Intelligence Active'));

// --- DICCIONARIO DE DUTY (PROTOCOLO ESTRICTO) ---
const DUTY_MAP = {
    HD: ['CAT', 'CUMMINS', 'JOHN DEERE', 'KOMATSU', 'MACK', 'FREIGHTLINER', 'BOBCAT', 'DETROIT DIESEL'],
    LD: ['TOYOTA', 'FORD', 'BMW', 'HONDA', 'KIA', 'HYUNDAI', 'NISSAN', 'MAZDA']
};

const detectDuty = (brand, input) => {
    const text = (brand + ' ' + input).toUpperCase();
    if (DUTY_MAP.HD.some(b => text.includes(b))) return 'HD';
    if (DUTY_MAP.LD.some(b => text.includes(b))) return 'LD';
    // Híbridos (Mercedes, Volvo, etc.)
    if (text.includes('VOLVO') || text.includes('MERCEDES')) return 'HYBRID_CHECK';
    return 'HD'; // Default por seguridad de ingeniería
};

// --- LÓGICA DE SCRAPER (CONSULTA PRIORITARIA) ---
const fetchExternalSpecs = async (code, duty) => {
    console.log(🔍 Scraper activado: Buscando  en fuentes ...);
    // Aquí se integra la URL de ScrapeStack hacia Donaldson o FRAM
    // Por ahora, el motor genera la estructura base lista para ser poblada
    return {
        source: duty === 'HD' ? 'Donaldson' : 'FRAM',
        verified: true
    };
};

const Filter = mongoose.model('FilterCache', new mongoose.Schema({
    originalCode: String, sku: String, technology: String, duty: String,
    hexColor: String, specs: mongoose.Schema.Types.Mixed
}));

app.get('/api/search/:code', async (req, res) => {
    const inputCode = req.params.code.toUpperCase();
    const brand = req.query.brand || '';
    
    try {
        // 1. Clasificación de DUTY
        let duty = detectDuty(brand, inputCode);
        
        // 2. Búsqueda en Cascada (Cache)
        let filter = await Filter.findOne({ originalCode: inputCode });
        if (filter) return res.json({ source: 'MASTER_CACHE', data: filter });

        // 3. Si es HYBRID, decidimos por Scraper
        if (duty === 'HYBRID_CHECK') {
            const external = await fetchExternalSpecs(inputCode, 'HD');
            duty = external.verified ? 'HD' : 'LD';
        }

        // 4. Generación de Identidad ELIMFILTERS (Regla de los 4 números)
        const numbers = inputCode.replace(/[^0-9]/g, '');
        const suffix = numbers.slice(-4).padStart(4, '0');
        const sku = EL8; // Ejemplo para Oil

        const newFilter = await Filter.create({
            originalCode: inputCode,
            sku: sku,
            duty: duty,
            technology: 'SYNTRAX™',
            hexColor: '#E31E24'
        });

        res.json({ source: 'v5.01_DYNAMIC_ENGINE', data: newFilter });

    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(process.env.PORT || 8080);