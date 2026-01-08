const express = require("express");
const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "OK", service: "world-catalogue" });
});

app.post("/api/search", (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: "code required" });
  res.json({ input: code, normalized: code, status: "OK" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server listening on " + PORT));
