const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ===== FORCE MARK =====
console.log("🔥 LOADING SCRAPER ROUTES WITH BATCH 🔥");

// ===============================
// ROUTES
// ===============================
const scraperRoutes = require("./routes/scraperRoutes");
app.use("/api/scraper", scraperRoutes);

// ===============================
// START SERVER
// ===============================
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log("🚀 ELIMFILTERS Backend API");
  console.log("📍 Server running on port", PORT);
  console.log("📋 Available endpoints:");
  console.log("   GET  /api/scraper/donaldson/:sku");
  console.log("   POST /api/scraper/donaldson/batch  <-- MUST EXIST");
});
