const express = require('express');
const { MongoClient } = require('mongodb');
const axios = require('axios');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
require('dotenv').config();

puppeteer.use(StealthPlugin());
const app = express();

// 1. PÁGINA DE BIENVENIDA (Para eliminar el "Cannot GET /")
app.get('/', (req, res) => {
    res.send('<h1>🚀 ELIMFILTERS ENGINE V102 ONLINE</h1><p>El sistema está listo. Haz tus búsquedas en /api/search/CODIGO</p>');
});

// 2. RUTA DE BÚSQUEDA REAL
app.get('/api/search/:code', async (req, res) => {
    const { code } = req.params;
    console.log(`[V102] 🔍 Iniciando búsqueda para: ${code}`);

    try {
        // Respuesta rápida para el navegador
        res.status(200).json({ 
            status: "PROCESSING", 
            message: `Estamos procesando el código ${code}. Revisa tu Google Sheet en 1 minuto.`,
            target: "MASTER_UNIFIED_V5"
        });

        // Ejecutar el motor en segundo plano (background) para que el navegador no de timeout
        runMasterEngine(code);

    } catch (err) {
        console.error("Error en la ruta:", err);
        if (!res.headersSent) res.status(500).json({ error: err.message });
    }
});

// Aquí va toda la lógica V100 que ya validamos...
async function runMasterEngine(inputCode) {
    // ... (Lógica de Scraper y Google Sheets)
}

app.listen(process.env.PORT || 8080, () => console.log("🚀 V102 ACTIVATED"));