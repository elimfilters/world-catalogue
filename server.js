// server.js - COMPLETE WITH SCRAPER ROUTES

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// ==========================================
// MIDDLEWARE
// ==========================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// MONGODB CONNECTION
// ==========================================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://elimfilters:Elliot2025@cluster0.vairwow.mongodb.net/?appName=Cluster0';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB conectado'))
.catch(err => console.error('❌ Error conectando a MongoDB:', err));

// ==========================================
// ROUTES
// ==========================================

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'online',
    message: 'ELIMFILTERS Backend API v11.0.6',
    timestamp: new Date().toISOString()
  });
});

// Rutas existentes
const scrapeRoutes = require('./routes/scrapeRoutes');
app.use('/api/scrape', scrapeRoutes);

// Rutas de filtros
const filterRoutes = require('./routes/filterRoutes');
app.use('/api/filters', filterRoutes);

// Stats route
app.get('/api/stats', (req, res) => {
  res.json({
    status: 'active',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// SCRAPER ROUTES - NUEVO
// ==========================================
const scraperRoutes = require('./routes/scraperRoutes');
app.use('/api/scraper', scraperRoutes);

// ==========================================
// ERROR HANDLING
// ==========================================
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message
  });
});

// ==========================================
// START SERVER
// ==========================================
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`
🚀 ELIMFILTERS Backend API
📍 Server running on port ${PORT}
🌐 Base URL: http://localhost:${PORT}
📋 Available endpoints:
   GET  /api/scrape/:code
   POST /api/scrape/multiple
   GET  /api/filters/search
   GET  /api/filters/:sku
   GET  /api/stats
   GET  /api/scraper/donaldson/:sku  [NEW]
✅ Ready to receive requests
  `);
});

module.exports = app;