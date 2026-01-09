const express = require('express');
const scraperRoutes = require('./routes/scraperRoutes');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

app.use('/api/scraper', scraperRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 ELIMFILTERS Backend API`);
  console.log(`📍 Server running on port ${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /api/scraper/donaldson/:sku`);
  console.log(`   POST /api/scraper/donaldson/batch`);
});