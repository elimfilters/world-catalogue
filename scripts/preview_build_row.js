// Preview script to visualize Master row columns using buildRowData
// Usage: node repo/scripts/preview_build_row.js <code_or_sku> [--lang=es|en] [--official-only]

const path = require('path');
// Monkey-patch syncSheetsService to avoid writing to Google Sheets during preview
const syncSvc = require('../src/services/syncSheetsService');
const { buildRowData } = syncSvc;
if (syncSvc && typeof syncSvc.upsertBySku === 'function') {
  syncSvc.upsertBySku = async function previewUpsertStub(sku, row) {
    console.log(`⚠️ Preview mode: skipping upsert for SKU ${sku}`);
    return { ok: true, preview: true, sku, row };
  };
}
// Also stub kit sheet writes invoked by Fleetguard enrichment
if (syncSvc && typeof syncSvc.saveKitToSheet === 'function') {
  syncSvc.saveKitToSheet = async function previewKitSaveStub(row) {
    console.log('⚠️ Preview mode: skipping kit save to sheet');
    return { ok: true, preview: true, row };
  };
}
// Optionally stub searchInSheet to reduce coupling (keep real search if needed)
// syncSvc.searchInSheet = async () => ({ found: false, row: null });

const detectMod = require('../src/services/detectionServiceFinal');
const { enrichHDWithFleetguard } = require('../src/services/fleetguardEnrichmentService');
const { extractDonaldsonSpecs } = require('../src/services/technicalSpecsScraper');

async function main() {
  const [,, codeArg, ...rest] = process.argv;
  if (!codeArg) {
    console.error('Error: provide a code or SKU. Example: node repo/scripts/preview_build_row.js AF25139M --lang=es');
    process.exit(1);
  }

  const langFlag = rest.find(a => a.startsWith('--lang='));
  const lang = langFlag ? langFlag.split('=')[1] : 'es';
  const officialOnly = (() => {
    const flag = rest.find(a => a.startsWith('--official-only'));
    if (!flag) return false;
    if (flag.includes('=')) {
      const v = flag.split('=')[1].trim().toLowerCase();
      return v !== 'false' && v !== '0';
    }
    return true;
  })();

  try {
    // Use detection pipeline to build a realistic input for buildRowData
    const detectFn = detectMod && (detectMod.default || detectMod.detectFilter || detectMod);
    if (typeof detectFn !== 'function') {
      throw new Error('detectFilter export not found');
    }
    const det = await detectFn(codeArg, lang, { force: true, generateAll: false });

    const data = {
      // Identification
      code_input: codeArg,
      query_normalized: det.query_normalized || codeArg,
      sku: det.sku,
      // Classification
      family: det.family,
      duty: det.duty,
      filter_type: det.filter_type || det.type || det.family,
      // Descriptive fields
      description: det.description,
      media_type: det.media || det.media_type,
      // Cross refs and OEMs
      cross_reference: det.cross_reference,
      oem_codes: det.oem_codes || det.oem || det.oems,
      // Applications and equipment
      applications: det.applications,
      equipment_applications: det.equipment_applications,
      // Attributes and dimensions/specs
      attributes: det.attributes,
      specifications: det.specifications || det.specs,
      dimensions: det.dimensions,
      // Raw parsed signals when available
      subtypeDescriptor: det.subtype || det.subtypeDescriptor,
    };

    // In official-only mode, purge non-official sources to force enrichment-only fill
    if (officialOnly) {
      data.cross_reference = '';
      data.oem_codes = '';
      data.equipment_applications = '';
      data.engine_applications = '';
    }

    // Enriquecer OEM y cross refs desde fuentes oficiales (Fleetguard API/Página)
    let enriched = null;
    try {
      const { masterData } = await enrichHDWithFleetguard(data, { codeDonaldson: codeArg, skuInterno: data.sku });
      enriched = masterData;
    } catch (_) {}
    // Complementar con datos oficiales de Donaldson (oem y cross refs)
    try {
      const donCode = String(det?.oem_code || det?.homologated_code || det?.donaldson_code || codeArg).replace(/[^A-Z0-9]/gi, '');
      if (donCode) {
        const specs = await extractDonaldsonSpecs(donCode);
        if (specs && (specs.found || (specs.oem_codes?.length || specs.cross_reference?.length))) {
          const target = enriched || data;
          const oemStr = Array.isArray(specs.oem_codes) ? specs.oem_codes.join(', ') : '';
          const crossStr = Array.isArray(specs.cross_reference) ? specs.cross_reference.join(', ') : '';
          if (!target.oem_codes && oemStr) target.oem_codes = oemStr;
          if (!target.cross_reference && crossStr) target.cross_reference = crossStr;
          const equipStr = Array.isArray(specs.equipment_applications) ? specs.equipment_applications.join('; ') : '';
          const engStr = Array.isArray(specs.engine_applications) ? specs.engine_applications.join('; ') : '';
          if (!target.equipment_applications && equipStr) target.equipment_applications = equipStr;
          if (!target.engine_applications && engStr) target.engine_applications = engStr;
          enriched = target;
        }
      }
    } catch (_) {}

    const inputForRow = enriched || data;
    const row = buildRowData(inputForRow);

    // normsku in preview must reflect the generated SKU (row.normsku)

    // Select a readable preview of key columns
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
      cross_reference: row.cross_reference,
      equipment_applications: row.equipment_applications,
      engine_applications: row.engine_applications,
      height_mm: row.height_mm,
      outer_diameter_mm: row.outer_diameter_mm,
      inner_diameter_mm: row.inner_diameter_mm,
      thread_size: row.thread_size,
      filter_length_mm: row.filter_length_mm,
      flow_direction: row.flow_direction,
      micron_rating: row.micron_rating,
      max_pressure_psi: row.max_pressure_psi,
    };

    console.log('=== Preview (Master row) ===');
    console.log(JSON.stringify(preview, null, 2));
  } catch (err) {
    console.error('Preview failed:', err && err.message ? err.message : err);
    process.exit(2);
  }
}

main();