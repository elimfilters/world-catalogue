// ============================================
// SERVER.JS - ELIMFILTERS API v11.0.6
// ============================================
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ========================================
// MIDDLEWARE
// ========================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ========================================
// MONGODB CONNECTION
// ========================================
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000
})
.then(() => {
  console.log('✅ MongoDB connected');
  console.log('   Database:', mongoose.connection.name);
  console.log('   Host:', mongoose.connection.host);
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  process.exit(1);
});

// ========================================
// ROUTES
// ========================================
const filterRoutes = require('./routes/filterRoutes');

// Ruta de prueba principal
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'ELIMFILTERS API v11.0.6',
    status: 'online',
    server: process.env.SERVER_ID || 'PRIMARY',
    endpoints: {
      health: '/health',
      test: '/test',
      search: '/api/v1/search',
      filters: '/api/v1/filters',
      stats: '/api/v1/stats'
    }
  });
});

// Ruta de diagnóstico
app.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Test endpoint funcionando correctamente',
    timestamp: new Date().toISOString(),
    server: process.env.SERVER_ID || 'PRIMARY',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV
  });
});

// Health Check
app.get('/health', async (req, res) => {
  try {
    const Filter = require('./models/filterModel');
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const testQuery = await Filter.countDocuments().maxTimeMS(5000);
    
    res.status(200).json({
      status: 'healthy',
      server: process.env.SERVER_ID || 'PRIMARY',
      location: process.env.SERVER_LOCATION || 'unknown',
      timestamp: new Date().toISOString(),
      database: mongoStatus,
      recordCount: testQuery,
      uptime: Math.floor(process.uptime()),
      version: '11.0.6'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      server: process.env.SERVER_ID || 'PRIMARY',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Server Info
app.get('/server-info', (req, res) => {
  res.json({
    serverId: process.env.SERVER_ID || 'PRIMARY',
    location: process.env.SERVER_LOCATION || 'unknown',
    version: '11.0.6',
    environment: process.env.NODE_ENV,
    uptime: Math.floor(process.uptime()),
    nodeVersion: process.version,
    platform: process.platform
  });
});

// API Routes
app.use('/api/v1', filterRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
    path: req.path
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ========================================
// START SERVER
// ========================================
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log('🚀 ELIMFILTERS API v11.0.6 running on port', PORT);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM recibido');
  server.close(() => {
    mongoose.connection.close(false, () => {
      process.exit(0);
    });
  });
});

module.exports = app;
