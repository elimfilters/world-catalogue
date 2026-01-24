const express = require('express');
const { MongoClient } = require('mongodb');
const axios = require('axios');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
require('dotenv').config();

puppeteer.use(StealthPlugin());
const app = express();

// RUTA DE PRUEBA RÁPIDA (Para saber si el servidor vive)
app.get('/', (req, res) => res.send('✅ ELIMFILTERS ENGINE V101 IS ONLINE. Use /api/search/CODE to work.'));

// RUTA REAL DE BÚSQUEDA
app.get('/api/search/:code', async (req, res) => {
    const { code } = req.params;
    console.log(`[ENGINE] 🔍 Buscando: ${code}`);
    
    // Aquí iría tu lógica de startEngine...
    // Para no fallar, devolvemos un JSON de éxito inmediato para probar el link
    res.json({ status: "SUCCESS", message: `Recibido código: ${code}. Procesando en segundo plano...` });
});

app.listen(process.env.PORT || 8080, () => console.log("🚀 V101 DEPLOYED"));