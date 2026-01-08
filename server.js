const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ===============================
// ROUTES
// ===============================
const scraperRoutes = require("./routes/scraperRoutes");

// MONTAR SCRAPER DONALDSON (INDIVIDUAL + BATCH)
app.use("/api/scraper", scraperRoutes);

// ===============================
// ROOT
// ===============================
app.get("/", (req, res) => {
  res.json({ status: "ELIMFILTERS API RUNNING" });
});

// ===============================
// START SERVER (RAILWAY)
// ===============================
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log("🚀 ELIMFILTERS Backend API");
  console.log("📍 Server running on port", PORT);
  console.log("📋 Available endpoints:");
  console.log("   GET  /api/scraper/donaldson/:sku");
  console.log("   POST /api/scraper/donaldson/batch");
});
