require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const classifierService = require('./services/classifier.service');
const sheetsService = require('./services/sheets.service');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbStatus = require('./config/database').isConnected() ? 'connected' : 'disconnected';
  const groqStatus = process.env.GROQ_API_KEY ? 'configured' : 'missing';
  const sheetsStatus = process.env.GOOGLE_SHEET_ID ? 'configured' : 'missing';
  
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    mongodb: dbStatus,
    groq: groqStatus,
    sheets: sheetsStatus
  });
});

// Classify filter endpoint
app.post('/api/classify-filter', async (req, res) => {
  try {
    const { filterCode } = req.body;

    if (!filterCode) {
      return res.status(400).json({ error: 'filterCode is required' });
    }

    const classification = await classifierService.classifyFilter(filterCode);
    res.json(classification);

  } catch (error) {
    console.error('Classification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export to Google Sheets endpoint
app.post('/api/export/sheets', async (req, res) => {
  try {
    const { filterCode } = req.body;

    if (!filterCode) {
      return res.status(400).json({ error: 'filterCode is required' });
    }

    // Get classification
    const classification = await classifierService.classifyFilter(filterCode);

    // Export to Sheets
    const result = await sheetsService.exportClassification(filterCode, classification);

    res.json({
      filterCode,
      classification,
      exported: result.success,
      error: result.error || null
    });

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Batch export endpoint
app.post('/api/export/sheets/batch', async (req, res) => {
  try {
    const { filterCodes } = req.body;

    if (!Array.isArray(filterCodes) || filterCodes.length === 0) {
      return res.status(400).json({ error: 'filterCodes array is required' });
    }

    const results = [];
    
    for (const filterCode of filterCodes) {
      try {
        const classification = await classifierService.classifyFilter(filterCode);
        const exportResult = await sheetsService.exportClassification(filterCode, classification);
        
        results.push({
          filterCode,
          success: exportResult.success,
          classification: exportResult.success ? classification : null,
          error: exportResult.error || null
        });
      } catch (error) {
        results.push({
          filterCode,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    res.json({
      total: filterCodes.length,
      successful: successCount,
      failed: filterCodes.length - successCount,
      results
    });

  } catch (error) {
    console.error('Batch export error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  
  // Connect to MongoDB
  await connectDB();
  
  // Initialize Google Sheets
  try {
    await sheetsService.initialize();
  } catch (error) {
    console.error('⚠️  Google Sheets initialization failed:', error.message);
  }
});
```

**Guarda y cierra**

---

## 🎯 PASO 2: DAR PERMISOS AL SERVICE ACCOUNT

**IMPORTANTE:** El Service Account necesita permisos de EDITOR en tu Google Sheet:

1. Abre tu Google Sheet: https://docs.google.com/spreadsheets/d/1ZYI5c0enkuvWAveu8HMaCUk1cek_VDrX8GtgKW7VP6U/edit
2. Click en **"Compartir"** (arriba derecha)
3. Agrega este email: `elimfilters-writer@gen-lang-client-0000922456.iam.gserviceaccount.com`
4. Rol: **Editor**
5. Click **"Enviar"**

---

## ✅ PASO 3: PREPARAR LA HOJA

En tu Google Sheet, asegúrate de que **Sheet1** tenga estos headers en la fila 1:
```
Timestamp | Filter Code | Manufacturer | Tier | Duty | Region | Confidence | Method | Cached