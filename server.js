const express = require('express');
const mongoose = require('mongoose');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const app = express();
app.use(express.json());

// 1. CONEXIÓN MONGODB
mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log('✅ MongoDB Conectado'))
    .catch(err => console.error('❌ Error Mongo:', err.message));

const Filter = mongoose.model('Filter', new mongoose.Schema({
    originalCode: String,
    sku: String,
    timestamp: { type: Date, default: Date.now }
}));

// 2. FUNCIÓN GOOGLE SHEETS (Asíncrona)
async function syncToSheets(data) {
    try {
        if (!process.env.GOOGLE_PRIVATE_KEY) return;
        const auth = new JWT({
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];
        await sheet.addRow({ SKU: data.sku, CODIGO: data.originalCode, FECHA: new Date().toISOString() });
        console.log('✅ Google Sheets Sincronizado');
    } catch (e) { console.error('⚠️ Error Sheets:', e.message); }
}

// 3. RUTAS API (Corregidas para evitar "Cannot GET")
app.get('/', (req, res) => res.send('🚀 Motor ELIMFILTERS v5.10 Online'));

app.get('/api/search/:code', async (req, res) => {
    try {
        const code = req.params.code.toUpperCase();
        let filter = await Filter.findOne({ originalCode: code });
        
        if (!filter) {
            // Lógica de generación de SKU segura
            const sku = "EL-" + code.replace(/[^0-9]/g, '').slice(-5);
            filter = await Filter.create({ originalCode: code, sku: sku });
            syncToSheets(filter); // Sincroniza en segundo plano
        }
        
        res.json({ success: true, data: filter });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log('🚀 Servidor ELIMFILTERS Corriendo en puerto ' + PORT));