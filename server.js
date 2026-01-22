const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
app.use(express.json());

// 1. CONEXIÓN MONGODB
mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log('✅ MongoDB Conectado'))
    .catch(err => console.error('❌ Error Mongo:', err.message));

const Filter = mongoose.model('FilterCache', new mongoose.Schema({
    originalCode: { type: String, unique: true },
    sku: String,
    category: String,
    source: String,
    timestamp: { type: Date, default: Date.now }
}));

// 2. FUNCIÓN GOOGLE SHEETS (Sintaxis Ultra-Segura)
async function syncToSheets(data) {
    try {
        if (!process.env.GOOGLE_PRIVATE_KEY) return;
        
        const serviceAccountAuth = new JWT({
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            // Esta línea es la que fallaba, ahora está blindada:
            key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];
        await sheet.addRow({
            'FECHA': new Date().toLocaleString(),
            'SKU': data.sku,
            'CODIGO': data.originalCode,
            'CATEGORIA': data.category
        });
        console.log('✅ Sheets Sincronizado');
    } catch (e) {
        console.error('⚠️ Error Sheets:', e.message);
    }
}

// 3. ENDPOINT (Mongo -> Sheets)
app.get('/api/search/:code', async (req, res) => {
    const code = req.params.code.toUpperCase();
    const cat = req.query.cat || 'Oil';
    try {
        let filter = await Filter.findOne({ originalCode: code });
        if (filter) return res.json({ source: 'CACHE', data: filter });

        const suffix = code.replace(/[^0-9]/g, '').slice(-4).padStart(4, '0');
        const sku = "EL" + suffix;

        const newEntry = await Filter.create({
            originalCode: code, 
            sku: sku, 
            category: cat,
            source: 'V5.10_STABLE'
        });

        syncToSheets(newEntry);
        res.json({ success: true, data: newEntry });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log('🚀 Servidor ELIMFILTERS Corriendo'));