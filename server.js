/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ELIMFILTERS BACKEND SERVER
 * ═══════════════════════════════════════════════════════════════════════════
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 3000;

// ═══════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ═══════════════════════════════════════════════════════════════════════════
// MONGODB CONNECTION
// ═══════════════════════════════════════════════════════════════════════════

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log("✅ MongoDB conectado");
})
.catch((error) => {
  console.error("❌ Error conectando MongoDB:", error);
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// Health check
app.get("/", (req, res) => {
  res.json({
    service: "ELIMFILTERS Backend API",
    version: "1.0.0",
    status: "running",
    endpoints: {
      scrape_single: "GET /api/scrape/:code",
      scrape_multiple: "POST /api/scrape/multiple",
      search_filters: "GET /api/filters/search?q=code",
      get_filter: "GET /api/filters/:sku",
      stats: "GET /api/stats"
    }
  });
});

// API Routes
const apiRoutes = require("./routes/api.routes");
app.use("/api", apiRoutes);

// ═══════════════════════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════════════════════

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint no encontrado"
  });
});

app.use((error, req, res, next) => {
  console.error("❌ Error global:", error);
  res.status(500).json({
    success: false,
    error: error.message
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`\n🚀 ELIMFILTERS Backend API`);
  console.log(`📍 Server running on port ${PORT}`);
  console.log(`🌐 Base URL: http://localhost:${PORT}`);
  console.log(`\n📋 Available endpoints:`);
  console.log(`   GET  /api/scrape/:code`);
  console.log(`   POST /api/scrape/multiple`);
  console.log(`   GET  /api/filters/search`);
  console.log(`   GET  /api/filters/:sku`);
  console.log(`   GET  /api/stats`);
  console.log(`\n✅ Ready to receive requests\n`);
});
