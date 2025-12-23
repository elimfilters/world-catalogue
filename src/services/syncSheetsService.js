const { upsertBySku } = require('./syncSheetsService');

async function detectPartNumber(partNumber) {
  // ... tu lógica de detección existente ...
  
  const result = await scraperBridge(partNumber);
  
  if (result && result.success) {
    // Guardar automáticamente en Sheets
    try {
      await upsertBySku({
        sku: result.normsku,
        query_normalized: partNumber,
        duty: result.duty_type,
        type: result.filter_type,
        family: result.family,
        attributes: result.attributes,
        oem_codes: result.oem_codes,
        cross_reference: result.cross_reference,
        // ... otros campos relevantes
      });
      console.log(`✅ Guardado en Sheets: ${result.normsku}`);
    } catch (err) {
      console.error('⚠️ Error guardando en Sheets:', err.message);
      // No fallar la búsqueda si Sheets falla
    }
  }
  
  return result;
}
