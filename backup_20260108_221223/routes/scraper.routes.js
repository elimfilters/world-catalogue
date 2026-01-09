const express = require("express");
const router = express.Router();
const filterOrchestrator = require("../services/filter.orchestrator");

/**
 * GET /api/scrape/:code
 * Endpoint principal de búsqueda/generación de SKU
 * 
 * Query params:
 * - manufacturer: Fabricante (opcional, ayuda a detectar DUTY)
 * - application: Aplicación (opcional, ayuda a detectar DUTY)
 * 
 * Proceso:
 * 1. Buscar en Google Sheets
 * 2. Buscar en MongoDB
 * 3. Si no existe → Cross-reference (Donaldson HD / FRAM LD)
 * 4. Generar TRILOGY de SKUs ELIMFILTERS
 */
router.get("/:code", async (req, res) => {
  const { code } = req.params;
  const { manufacturer = "", application = "" } = req.query;
  
  console.log(`\n🔍 REQUEST: ${code}`);
  if (manufacturer) console.log(`   Manufacturer: ${manufacturer}`);
  if (application) console.log(`   Application: ${application}`);
  
  try {
    const result = await filterOrchestrator.process(code, manufacturer, application);
    
    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.error,
        input_code: code
      });
    }
    
    res.json({
      success: true,
      input_code: code,
      source: result.source,
      cross_reference_source: result.cross_reference_source,
      duty: result.duty,
      filter_type: result.filter_type,
      trilogy: result.trilogy,
      metadata: {
        generated_at: new Date().toISOString(),
        version: "1.0.0"
      }
    });
    
  } catch (error) {
    console.error(`❌ ERROR: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/scrape/multiple
 * Procesar múltiples códigos en batch
 */
router.post("/multiple", async (req, res) => {
  const { codes, manufacturer = "", application = "" } = req.body;
  
  if (!codes || !Array.isArray(codes)) {
    return res.status(400).json({
      success: false,
      error: "Se requiere array 'codes'"
    });
  }
  
  try {
    const results = [];
    
    for (const code of codes) {
      const result = await filterOrchestrator.process(code, manufacturer, application);
      results.push(result);
    }
    
    res.json({
      success: true,
      total: codes.length,
      results
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

