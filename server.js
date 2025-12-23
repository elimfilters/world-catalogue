/**
 * ELIMFILTERS API Server - v5.0.0
 * Servidor principal con detección y escritura a Google Sheets
 */

const express = require('express');
const cors = require('cors');
const detectRouter = require('./src/api/detect');
const processRouter = require('./src/api/process');
const metricsMarineRouter = require('./src/api/metricsMarine');
const { checkMarineAlerts } = require('./src/services/marineAlerts');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log('📥 ' + req.method + ' ' + req.path + ' - ' + new Date().toISOString());
  next();
});

app.get('/', (req, res) => {
  res.status(200).json({
    name: 'ELIMFILTERS API',
    version: '5.0.0',
    status: 'running',
    endpoints: {
      health: 'GET /health',
      search: 'POST /search',
      searchLegacy: 'GET /search?partNumber=XXX',
      process: 'POST /api/process',
      processGet: 'GET /api/process/:code',
      processBatch: 'POST /api/process/batch',
      metrics: 'GET /metrics/marine'
    },
    features: [
      'Filter Detection (HD/LD/MARINE)',
      'SKU Generation',
      'Google Sheets Integration',
      'Cross-Reference Lookup',
      'Batch Processing'
    ]
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'ELIMFILTERS Detection API',
    version: '5.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memory: process.memoryUsage(),
    features: {
      detection: true,
      googleSheets: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
      batch: true,
      marine: true
    }
  });
});

app.use('/search', detectRouter);
app.use('/api/process', processRouter);
app.use('/metrics/marine', metricsMarineRouter);

app.use((req, res) => {
  console.log('❌ 404 - Route not found: ' + req.method + ' ' + req.path);
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    requestedPath: req.path,
    availableEndpoints: [
      'POST /search',
      'GET /search?partNumber=XXX',
      'POST /api/process',
      'GET /api/process/:code',
      'POST /api/process/batch',
      'GET /health',
      'GET /metrics/marine'
    ]
  });
});

app.use((err, req, res, next) => {
  console.error('💥 [SERVER ERROR]:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

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

app.listen(PORT, () => {
  console.log('────────────────────────────────────────────────────────');
  console.log('🚀 ELIMFILTERS API v5.0.0');
  console.log('📡 Running on port ' + PORT);
  console.log('🌎 Environment: ' + (process.env.NODE_ENV || 'development'));
  console.log('────────────────────────────────────────────────────────');
  console.log('📍 Health: http://localhost:' + PORT + '/health');
  console.log('🔍 Search: POST http://localhost:' + PORT + '/search');
  console.log('📝 Process: POST http://localhost:' + PORT + '/api/process');
  console.log('📝 Batch: POST http://localhost:' + PORT + '/api/process/batch');
  console.log('────────────────────────────────────────────────────────');
  
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    console.log('✅ Google Sheets integration: ENABLED');
  } else {
    console.log('⚠️  Google Sheets integration: DISABLED (missing credentials)');
  }
});

module.exports = app;
