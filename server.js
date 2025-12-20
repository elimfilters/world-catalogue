const express = require('express');
const cors = require('cors');
const detectRouter = require('./src/api/detect');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// ✅ RUTAS PRINCIPALES
app.use('/', detectRouter);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'ELIMFILTERS Detection API',
    version: '5.0.0',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  console.log('❌ 404 - Route not found:', req.method, req.path);
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    requestedPath: req.path,
    availableEndpoints: [
      'POST /search?mode=partag',
      'GET /health'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('💥 [SERVER ERROR]:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`────────────────────────────────────────────────────────`);
  console.log(`🚀 ELIMFILTERS API v5.0.0`);
  console.log(`📡 Running on port ${PORT}`);
  console.log(`🌎 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`────────────────────────────────────────────────────────`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔍 Search endpoint: POST http://localhost:${PORT}/search?mode=partag`);
});

module.exports = app;
