require('dotenv').config();

// MongoDB Connection
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ===== FORCE MARK =====
console.log("🔥 LOADING SCRAPER ROUTES WITH BATCH 🔥");

// ===============================
// ROUTES
// ===============================
const scraperRoutes = require("./routes/scraperRoutes");
app.use("/api/scraper", scraperRoutes);

const framRoutes = require('./routes/framRoutes');
app.use('/api/scraper', framRoutes);

const apiRoutes = require('./routes/api.routes');
app.use('/api', apiRoutes);

const filterSearchRouter = require('./routes/filter.search.api');
app.use('/api', filterSearchRouter);

const searchRoutes = require('./routes/search');
app.use('/api', searchRoutes);

// ===============================
// CLASSIFIER ROUTES (NUEVO - 100+ Fabricantes)
// ===============================
const classifierRoutes = require('./routes/classifier.routes');
app.use('/api/classifier', classifierRoutes);

// ===============================
// CLASSIFIER ENDPOINTS (Compatibilidad con endpoints viejos)
// ===============================
const classifierService = require('./services/classifier.service');

app.post('/api/validate-filter', async (req, res) => {
  try {
    const { filterCode } = req.body;
    if (!filterCode) {
      return res.status(400).json({ error: 'filterCode is required' });
    }
    
    // Usar el nuevo classifier
    const result = await classifierService.processFilter(filterCode);
    
    if (result.success) {
      const classification = result.classification;
      const isValid = classification.manufacturer !== 'Unknown' && classification.confidence !== 'low';
      
      res.json({
        filterCode,
        valid: isValid,
        classification: isValid ? classification : null,
        reason: isValid ? null : 'Unknown manufacturer or low confidence'
      });
    } else {
      res.json({
        filterCode,
        valid: false,
        classification: null,
        reason: result.error
      });
    }
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/classify-filter', async (req, res) => {
  try {
    const { filterCode } = req.body;
    if (!filterCode) {
      return res.status(400).json({ error: 'filterCode is required' });
    }
    
    const result = await classifierService.processFilter(filterCode);
    res.json(result);
  } catch (error) {
    console.error('Classification error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/classify-batch', async (req, res) => {
  try {
    const { filterCodes } = req.body;
    if (!Array.isArray(filterCodes) || filterCodes.length === 0) {
      return res.status(400).json({ error: 'filterCodes array is required' });
    }
    
    const results = await classifierService.processBatch(filterCodes);
    const validCount = results.filter(r => r.success).length;
    
    res.json({
      total: filterCodes.length,
      valid: validCount,
      invalid: filterCodes.length - validCount,
      results
    });
  } catch (error) {
    console.error('Batch classify error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/classifier/stats', async (req, res) => {
  try {
    const stats = await classifierService.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===============================
// START SERVER
// ===============================
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log("🚀 ELIMFILTERS Backend API");
  console.log("📍 Server running on port", PORT);
});
