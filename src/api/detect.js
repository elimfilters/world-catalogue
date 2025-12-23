// SOLUCIÓN INMEDIATA: Endpoint GET para compatibilidad con WordPress
// Agregar ANTES del POST /search existente en routes/detect.js

// GET sin mode (WordPress plugin)
router.get('/search', async (req, res) => {
  console.log('⚠️ [LEGACY] GET /search sin mode');
  
  const partNumber = req.query.partNumber || req.query.q || req.query.part;
  
  if (!partNumber) {
    return res.status(400).json({
      status: 'error',
      message: 'Parámetro requerido: ?partNumber=XXX'
    });
  }

  try {
    const result = await detectionService.detectPartNumber(partNumber.trim());
    res.json(result);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// POST con mode=partag (existente, NO CAMBIAR)
// router.post('/search', (req, res) => {
//   if (req.query.mode !== 'partag') {
//     return res.status(400).json({ error: 'mode=partag required' });
//   }
//   // ... resto del código
// });

// Tu endpoint POST existente continúa igual:
// router.post('/search', async (req, res) => { ... }
