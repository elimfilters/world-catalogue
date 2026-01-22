const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
app.use(express.json());

// 1. CONEXIÓN MONGODB (Prioridad Absoluta)
mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log('✅ MongoDB Conectado: Motor ELIMFILTERS v5.10 Listo'))
    .catch(err => console.error('❌ Error Crítico Mongo:', err.message));

const Filter = mongoose.model('FilterCache', new mongoose.Schema({
    originalCode: { type: String, unique: true },
    sku: String,
    duty: String,
    category: String,
    source: String,
    isOemFallback: Boolean,
    specs: mongoose.Schema.Types.Mixed,
    timestamp: { type: Date, default: Date.now }
}));

// 2. FUNCIÓN GOOGLE SHEETS (Segundo Plano)
async function syncToSheets(data) {
    try {
        if (!process.env.GOOGLE_PRIVATE_KEY) return;
        const serviceAccountAuth = new JWT({
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY.split(String.raw\n).join('\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];
        await sheet.addRow({
            'FECHA': new Date().toLocaleString(),
            'SKU': data.sku,
            'CODIGO': data.originalCode,
            'CATEGORIA': data.category,
            'FUENTE': data.source
        });
        console.log('✅ Google Sheets Sincronizado');
    } catch (e) {
        console.error('⚠️ Error Sheets (No detiene el sistema):', e.message);
    }
}

// 3. ENDPOINT PRINCIPAL (Mongo Primero -> Sheets Después)
app.get('/api/search/:code', async (req, res) => {
    const code = req.params.code.toUpperCase();
    const cat = req.query.cat || 'Oil';
    try {
        // BUSCAR EN CACHE (MONGO)
        let filter = await Filter.findOne({ originalCode: code });
        if (filter) return res.json({ source: 'CACHE', data: filter });

        // SI NO ESTÁ, LÓGICA DE SKU (SIMPLIFICADA PARA EL TEST)
        const suffix = code.replace(/[^0-9]/g, '').slice(-4).padStart(4, '0');
        const sku = "EL" + suffix; // Ejemplo genérico

        // GUARDADO PRIORITARIO EN MONGODB
        const newEntry = await Filter.create({
            originalCode: code, 
            sku: sku, 
            category: cat,
            source: 'SCRAPER_V5',
            isOemFallback: false
        });
        console.log('✅ Registro creado en MongoDB');

        // SINCRONIZACIÓN CON SHEETS (SIN AWAIT PARA NO RETRASAR RESPUESTA)
        syncToSheets(newEntry);

        // RESPUESTA AL CLIENTE (INMEDIATA)
        res.json({ source: 'DATABASE_NEW', data: newEntry });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log('🚀 Servidor ELIMFILTERS Corriendo en puerto ' + PORT));