'use strict';
// Inline preview for AF25139 using buildRowData without full detection pipeline
// Usage: node repo/scripts/preview_af25139_inline.js

try { require('dotenv').config(); } catch (_) {}
const { buildRowData } = require('../src/services/syncSheetsService');

function main() {
  const data = {
    code_input: 'AF25139',
    query_normalized: 'AF25139',
    // From detection logs: EA17682 generated via P527682 last4 7682
    sku: 'EA17682',
    duty: 'HD',
    family: 'AIRE',
    filter_type: 'AIRE',
    description: 'Filtro de Aire sello radial (derivado de AF25139)',
    media_type: 'MACROCORE™',
    // Use Donaldson homologation as cross-reference input
    cross_reference: ['P527682'],
    // OEM codes unknown here; leave empty to let service handle defaults
    oem_codes: [],
    attributes: {}
  };

  const row = buildRowData(data);
  const preview = {
    query: row.query,
    normsku: row.normsku,
    duty_type: row.duty_type,
    type: row.type,
    subtype: row.subtype,
    description: row.description,
    tecnologia_aplicada: row.tecnologia_aplicada,
    media_type: row.media_type,
    oem_codes: row.oem_codes,
    oem_codes_indice_mongo: row.oem_codes_indice_mongo,
    cross_reference: row.cross_reference,
    cross_reference_indice_mongo: row.cross_reference_indice_mongo,
    equipment_applications: row.equipment_applications,
    engine_applications: row.engine_applications,
    height_mm: row.height_mm,
    outer_diameter_mm: row.outer_diameter_mm,
    inner_diameter_mm: row.inner_diameter_mm,
    thread_size: row.thread_size,
    micron_rating: row.micron_rating
  };

  console.log(JSON.stringify(preview, null, 2));
}

main();