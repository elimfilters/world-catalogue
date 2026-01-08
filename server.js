const express = require('express');
const cors = require('cors');
const scraperRoutes = require('./routes/scraperRoutes');

const app = express();
app.use(cors());
app.use(express.json());

// Usar el scraper dinámico con Puppeteer
app.use('/api/scraper', scraperRoutes);

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 ELIMFILTERS Backend API');
    console.log('📍 Server running on port ' + PORT);
    console.log('📋 Available endpoints:');
    console.log('   GET  /api/scraper/donaldson/:sku  [Puppeteer Dynamic]');
});
