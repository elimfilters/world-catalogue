const { appendToSheet } = require('./sheets');

/**
 * Exportar productos filtrados a Google Sheets
 * @param {Array} products - Array de productos filtrados
 */
async function exportProductsToSheets(products) {
  try {
    // Convertir los productos al formato de filas para Google Sheets
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

    console.log(`📤 Exportando ${rows.length} productos a Google Sheets...`);
    
    // Agregar las filas al final de la hoja (después de los encabezados)
    await appendToSheet(rows, 'MASTER_UNIFIED_V5!A:AV');
    
    console.log(`✅ ${rows.length} productos exportados exitosamente`);
    return { success: true, count: rows.length };
  } catch (error) {
    console.error('❌ Error exportando a Google Sheets:', error.message);
    throw error;
  }
}

module.exports = { exportProductsToSheets };