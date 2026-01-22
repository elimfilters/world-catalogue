const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URL).then(() => console.log('🚀 Motor ELIMFILTERS v5.02: Inteligencia de Fabricante Activa'));

// --- DICCIONARIO MAESTRO DE FABRICANTES ---
const MANUFACTURERS = {
    HD: ['CATERPILLAR', 'CAT', 'CUMMINS', 'DETROIT DIESEL', 'JOHN DEERE', 'KOMATSU', 'MACK', 'VOLVO TRUCK', 'KENWORTH', 'PETERBILT', 'FREIGHTLINER', 'PERKINS', 'DEUTZ', 'MTU', 'SCANIA', 'MAN'],
    LD: ['TOYOTA', 'FORD', 'CHEVROLET', 'NISSAN', 'HONDA', 'BMW', 'MERCEDES-BENZ', 'HYUNDAI', 'KIA', 'VOLKSWAGEN', 'MAZDA', 'SUBARU', 'STELLANTIS', 'JEEP']
};

// --- FUNCIÓN DE DETECCIÓN POR ESPECIFICACIÓN ---
const determineDutyFromSpecs = (brand, description) => {
    const text = (brand + ' ' + description).toUpperCase();
    
    // 1. Prioridad por Fabricante
    if (MANUFACTURERS.HD.some(m => text.includes(m))) return 'HD';
    if (MANUFACTURERS.LD.some(m => text.includes(m))) return 'LD';
    
    // 2. Prioridad por Palabras Clave de Equipo
    const hdKeywords = ['EXCAVATOR', 'GENSET', 'TRUCK', 'TRACTOR', 'LOADER', 'MINING', 'DIESEL ENGINE'];
    if (hdKeywords.some(k => text.includes(k))) return 'HD';
    
    return 'LD'; // Default para pasajeros si no hay indicios de equipo pesado
};

// --- SCRAPERS RECONSTRUIDOS (DONALDSON & FRAM) ---
const getExternalData = async (code) => {
    try {
        // Intentamos Donaldson (HD) primero por ser el estándar de ELIMFILTERS
        const donaldsonRes = await axios.get(https://api.scrapestack.com/scrape?access_key=&url=https://shop.donaldson.com/store/search?q=);
        
        // Si Donaldson tiene datos, es HD casi seguro
        if (donaldsonRes.data && donaldsonRes.data.includes('Specifications')) {
            return { brand: 'DONALDSON', duty: 'HD', specs: 'Extracted from Donaldson' };
        }

        // Si no, probamos FRAM (LD)
        const framRes = await axios.get(https://api.scrapestack.com/scrape?access_key=&url=https://www.fram.com/search?q=);
        if (framRes.data) {
            return { brand: 'FRAM', duty: 'LD', specs: 'Extracted from FRAM' };
        }

        return null;
    } catch (e) {
        return null;
    }
};

const Filter = mongoose.model('FilterCache', new mongoose.Schema({
    originalCode: String, sku: String, duty: String, manufacturer: String,
    technology: String, hexColor: String, specs: mongoose.Schema.Types.Mixed
}));

app.get('/api/search/:code', async (req, res) => {
    const code = req.params.code.toUpperCase();
    
    // 1. Fase Cascada: Buscar en Cache
    let filter = await Filter.findOne({ originalCode: code });
    if (filter) return res.json({ source: 'MASTER_CACHE', data: filter });

    // 2. Fase Scraper: Salir al mundo a buscar el fabricante
    const external = await getExternalData(code);
    const finalDuty = external ? determineDutyFromSpecs(external.brand, '') : 'HD';

    // 3. Generación de Identidad (Regla de los 4 números)
    const suffix = code.replace(/[^0-9]/g, '').slice(-4).padStart(4, '0');
    const sku = EL8;

    const newFilter = await Filter.create({
        originalCode: code,
        sku: sku,
        duty: finalDuty,
        manufacturer: external ? external.brand : 'UNKNOWN',
        technology: 'SYNTRAX™',
        hexColor: finalDuty === 'HD' ? '#000000' : '#E31E24'
    });

    res.json({ source: 'v5.02_INTELLIGENT_ENGINE', data: newFilter });
});

app.listen(process.env.PORT || 8080);