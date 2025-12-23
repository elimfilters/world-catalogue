// SOLUCIÓN INMEDIATA: Endpoint GET para compatibilidad con WordPress
// Agregar ANTES del POST /search existente en routes/detect.js

router.get('/search', async (req, res) => {
  console.log('⚠️ [LEGACY] GET /search - WordPress plugin');
  
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

// Tu endpoint POST existente continúa igual:
// router.post('/search', async (req, res) => { ... }
