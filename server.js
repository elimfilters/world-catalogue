require('dotenv').config();
const express = require("express");
const cors = require("cors");

const app = express();
const filterSearchRouter = require('./routes/filter.search.api');
app.use('/api', filterSearchRouter);
app.use(cors());
app.use(express.json());

// ===== FORCE MARK =====
console.log("🔥 LOADING SCRAPER ROUTES WITH BATCH 🔥");

// ===============================
// ROUTES
// ===============================
const scraperRoutes = require("./routes/scraperRoutes");
app.use("/api/scraper", scraperRoutes);
const framRoutes = require('./routes/framRoutes');
app.use('/api/scraper', framRoutes);
const apiRoutes = require('./routes/api.routes');
app.use('/api', apiRoutes);

// ===============================
// START SERVER
// ===============================

app.use('/api', require('./routes/search'));
const PORT = process.env.PORT || 8080;

app.use('/api', require('./routes/search'));
app.listen(PORT, () => {
  console.log("🚀 ELIMFILTERS Backend API");
  console.log("📍 Server running on port", PORT);
  console.log("📋 Available endpoints:");
  console.log("   GET  /api/scraper/donaldson/:sku");
  console.log("   POST /api/scraper/donaldson/batch  <-- MUST EXIST");
});

