// server.js
const express = require('express');
const app = express();

app.use(express.json());

app.post('/v1/search', (req, res) => {
  const { query } = req.body;
  
  // Validar query
  if (!query || query.length > 1000) {
    return res.status(400).json({ 
      error: 'Invalid query length' 
    });
  }
  
  // Llamar a Railway API
  const railwayUrl = `https://catalogo-production-7cef.up.railway.app/api/detect/${query}`;
  
  // ... lógica aquí
  
  res.json({ results: [...] });
});

app.listen(3000, () => {
  console.log('API running on port 3000');
});
