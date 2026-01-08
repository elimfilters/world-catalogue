const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const apiRoutes = require('./routes/api.routes');

const app = express();
app.use(cors());
app.use(express.json());

// Cargar Rutas
app.use('/api', apiRoutes);

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 ELIMFILTERS Backend API');
    console.log(`📍 Server running on port ${PORT}`);
    console.log('📋 Available endpoints:');
    console.log('   GET  /api/scrape/:code');
    console.log('   POST /api/scrape/multiple');
    console.log('   GET  /api/scraper/donaldson/:sku  [NEW]');
});
