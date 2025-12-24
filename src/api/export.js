/**
 * EXPORT API - Export filtered products to Google Sheets
 */

const express = require('express');
const router = express.Router();
const { appendToSheet } = require('../sheets');

router.post('/sheets', async (req, res) => {
  try {
    const { products } = req.body;

    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ 
        success: false,
        error: 'Se requiere un array de productos' 
      });
    }

    if (products.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'El array de productos esta vacio' 
      });
    }

    console.log('Exportando ' + products.length + ' productos a Google Sheets...');

    const rows = products.map(product => [
      product.query || '',
      product.normsku || '',
      product.duty_type || '',
      product.type || '',
      product.subtype || '',
      product.description || '',
      product.oem_codes || '',
      product.cross_reference || '',
      product.media_type || '',
      product.equipment_applications || '',
      product.engine_applications || '',
      product.height_mm || '',
      product.outer_diameter_mm || '',
      product.thread_size || '',
      product.micron_rating || '',
      product.operating_temperature_min_c || '',
      product.operating_temperature_max_c || '',
      product.fluid_compatibility || '',
      product.disposal_method || '',
      product.gasket_od_mm || '',
      product.gasket_id_mm || '',
      product.bypass_valve_psi || '',
      product.beta_200 || '',
      product.hydrostatic_burst_psi || '',
      product.dirt_capacity_grams || '',
      product.rated_flow_gpm || '',
      product.rated_flow_cfm || '',
      product.operating_pressure_min_psi || '',
      product.operating_pressure_max_psi || '',
      product.weight_grams || '',
      product.panel_width_mm || '',
      product.panel_depth_mm || '',
      product.water_separation_efficiency_percent || '',
      product.drain_type || '',
      product.inner_diameter_mm || '',
      product.pleat_count || '',
      product.seal_material || '',
      product.housing_material || '',
      product.iso_main_efficiency_percent || '',
      product.iso_test_method || '',
      product.manufacturing_standards || '',
      product.certification_standards || '',
      product.service_life_hours || '',
      product.change_interval_km || '',
      product.tecnologia_aplicada || '',
      product.technology_name || '',
      product.technology_tier || '',
      product.technology_scope || '',
      product.technology_equivalents || '',
      product.technology_oem_detected || ''
    ]);

    await appendToSheet(rows, 'MASTER_UNIFIED_V5!A:AV');

    console.log(rows.length + ' productos exportados exitosamente');

    res.json({ 
      success: true, 
      message: rows.length + ' productos exportados exitosamente',
      count: rows.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error exportando a Google Sheets:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Error al exportar a Google Sheets',
      details: error.message 
    });
  }
});

router.get('/status', (req, res) => {
  res.json({
    success: true,
    service: 'Google Sheets Export',
    status: 'operational',
    spreadsheet_id: process.env.SPREADSHEET_ID || 'not configured',
    sheet_name: 'MASTER_UNIFIED_V5'
  });
});

module.exports = router;