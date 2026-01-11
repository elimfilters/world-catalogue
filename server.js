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
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Health check
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

// Import routes
const filterRoutes = require('./routes/filter.routes');

// Use routes
app.use('/api/filters', filterRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    success: false,
    error: err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log('🚀 ELIMFILTERS Backend API');
  console.log(`📍 Server running on port ${PORT}`);
});

module.exports = app;
