const express = require('express');
const cors = require('cors');
const detectRouter = require('./src/api/detect');
const metricsMarineRouter = require('./src/api/metricsMarine');
const { checkMarineAlerts } = require('./src/services/marineAlerts');

const app = express();
const PORT = process.env.PORT || 8080;

// ================================
// Middleware base
// ================================
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================================
// Logging middleware
// ================================
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// ================================
// RUTAS PRINCIPALES
// ================================
// Ruta raíz - Información del API
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'ELIMFILTERS API',
    version: '5.0.0',
    status: 'running',
    endpoints: {
      health: 'GET /health',
      search: 'POST /search',
      searchLegacy: 'GET /search?partNumber=XXX',
      metrics: 'GET /metrics/marine'
    },
    documentation: 'https://catalogo-production-beaf.up.railway.app/health'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'ELIMFILTERS Detection API',
    version: '5.0.0',
    timestamp: new Date().toISOString()
  });
});

// Rutas de búsqueda
app.use('/search', detectRouter);

// Métricas MARINE (READ-ONLY)
app.use('/metrics/marine', metricsMarineRouter);

// ================================
// 404 handler
// ================================
app.use((req, res) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    requestedPath: req.path,
    availableEndpoints: [
      'POST /search',
      'GET /search?partNumber=XXX',
      'GET /health',
      'GET /metrics/marine'
    ]
  });
});

// ================================
// Error handler
// ================================
app.use((err, req, res, next) => {
  console.error('💥 [SERVER ERROR]:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// ================================
// MARINE ALERTS (AUTOMÁTICAS)
// ================================
setInterval(() => {
  try {
    const alerts = checkMarineAlerts();
    if (alerts && Array.isArray(alerts) && alerts.length > 0) {
      console.warn('🚨 MARINE ALERTS:', alerts);
    }
  } catch (e) {
    console.error('❌ Error in MARINE alerts:', e.message);
  }
}, 60000);

// ================================
// Start server
// ================================
app.listen(PORT, () => {
  console.log(`────────────────────────────────────────────────────────`);
  console.log(`🚀 ELIMFILTERS API v5.0.0`);
  console.log(`📡 Running on port ${PORT}`);
  console.log(`🌎 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`────────────────────────────────────────────────────────`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔍 Search POST: http://localhost:${PORT}/search`);
  console.log(`🔍 Search GET: http://localhost:${PORT}/search?partNumber=XXX`);
  console.log(`📊 Marine metrics: GET http://localhost:${PORT}/metrics/marine`);
});

module.exports = app;
