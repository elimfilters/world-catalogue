const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Health check - DEBE IR ANTES del 404 handler
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'ELIMFILTERS Backend API',
    version: '1.0.0',
    endpoints: [
      'POST /api/filters/classify',
      'GET /api/filters/classifications',
      'GET /api/filters/stats',
      'POST /api/filters/batch',
      'POST /api/filters/search-sheets'
    ]
  });
});

// Import and use routes
try {
  console.log('📂 Loading routes/filter.routes.js...');
  const filterRoutes = require('./routes/filter.routes');
  console.log('✅ Routes loaded successfully');
  
  app.use('/api/filters', filterRoutes);
  console.log('✅ Routes registered at /api/filters');
} catch (error) {
  console.error('❌ ERROR loading routes:', error.message);
  console.error('Stack trace:', error.stack);
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error middleware:', err);
  res.status(500).json({
    success: false,
    error: err.message
  });
});

// 404 handler - DEBE IR AL FINAL
app.use((req, res) => {
  console.log(`⚠️ 404: ${req.method} ${req.path}`);
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
    availableEndpoints: [
      'GET /',
      'POST /api/filters/classify',
      'GET /api/filters/classifications',
      'GET /api/filters/stats',
      'POST /api/filters/batch',
      'POST /api/filters/search-sheets'
    ]
  });
});

// Start server - AL FINAL
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log('🚀 ELIMFILTERS Backend API');
  console.log(`📍 Server running on port ${PORT}`);
  console.log('✅ Server ready to receive requests');
});

module.exports = app;
