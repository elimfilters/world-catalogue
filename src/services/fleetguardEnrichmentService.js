// =============================================================================
// FLEETGUARD ENRICHMENT SERVICE (HD)
// Implements the user-approved enrichment process for HD filters after
// Donaldson scraper generates CODIGO_DONALDSON and SKU_INTERNO.
// Steps:
//  - Fetch Fleetguard JSON by code
//  - Gracefully handle non-200 by returning empty object
//  - Map, normalize, and convert units (mm/psi/gpm) into technical fields
//  - Concatenate lists for sheet view, but preserve arrays for Mongo
// =============================================================================

'use strict';

// Use native fetch if available (Node 18+); otherwise lazy import node-fetch
const hasGlobalFetch = typeof fetch === 'function';
async function doFetch(url) {
  if (hasGlobalFetch) {
    return fetch(url, { method: 'GET' });
  } else {
    const nodeFetch = (await import('node-fetch')).default;
    return nodeFetch(url, { method: 'GET' });
  }
}

// Kits EK5 helpers and Sheets integration
const { processHDKits, deriveEk5Sku, summarizeComponents } = require('./kitService');
const { saveKitToSheet } = require('./syncSheetsService');

// ---- Helpers ---------------------------------------------------------------

function toNumberSafe(v) {
  const n = Number(String(v || '').replace(/[^0-9.+-]/g, ''));
  return isNaN(n) ? null : n;
}

function toMM(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  // Detect inches
  if (/\b(in|inch|inches)\b/i.test(s)) {
    const n = toNumberSafe(s);
    return n == null ? null : Number((n * 25.4).toFixed(2));
  }
  // Detect mm
  if (/\bmm\b/i.test(s)) {
    const n = toNumberSafe(s);
    return n == null ? null : Number(n.toFixed(2));
  }
  // Plain number: assume mm
  const n = toNumberSafe(s);
  return n == null ? null : Number(n.toFixed(2));
}

function toPSI(raw) {
  const n = toNumberSafe(raw);
  return n == null ? null : Number(n.toFixed(2));
}

function toGPM(raw) {
  const n = toNumberSafe(raw);
  return n == null ? null : Number(n.toFixed(2));
}

function joinList(arr, sep) {
  if (!Array.isArray(arr)) return '';
  return arr
    .map(v => (typeof v === 'string' ? v : (v?.toString?.() || '')))
    .map(s => s.trim())
    .filter(Boolean)
    .join(sep);
}

// ---- Main API --------------------------------------------------------------

/**
 * Fetch Fleetguard product JSON by Donaldson code.
 * @param {string} codeDonaldson - e.g. 'P552100'
 * @returns {Promise<object>} data_json (empty object if non-200)
 */
async function fetchFleetguardJSON(codeDonaldson) {
  try {
    const url = `https://www.fleetguard.com/api/v1/products/${encodeURIComponent(codeDonaldson)}`;
    const res = await doFetch(url);
    if (!res || !res.ok) {
      return {}; // CRÍTICO: continuar con vacíos
    }
    const data = await res.json();
    return data || {};
  } catch (_) {
    return {}; // Degradación silenciosa
  }
}

/**
 * Map Fleetguard JSON to technical details and list fields.
 * Returns both sheet-concatenated strings and native arrays for Mongo.
 * @param {object} data_json Fleetguard JSON
 * @returns {{ technical: object, lists_sheet: object, lists_mongo: object, description?: string }}
 */
function mapFleetguardToFinal(data_json) {
  const dj = data_json || {};
  const cross = Array.isArray(dj.crossReferences) ? dj.crossReferences : [];
  const apps = Array.isArray(dj.applications) ? dj.applications : [];
  const engineApps = Array.isArray(dj.engineApplications) ? dj.engineApplications : [];

  // Extract technicals
  const technical = {
    height_mm: toMM(dj.overallHeight),
    outer_diameter_mm: toMM(dj.outerDiameter),
    inner_diameter_mm: toMM(dj.innerDiameter),
    gasket_od_mm: toMM(dj.gasketOD),
    gasket_id_mm: toMM(dj.gasketID),
    thread_size: dj.threadSize || null,
    micron_rating: dj.absoluteMicronRating ?? dj.nominalMicronRating ?? null,
    bypass_valve_psi: toPSI(dj.bypassValveSettings),
    rated_flow_gpm: toGPM(dj.ratedFlow),
    weight_grams: dj.weightGrams ?? dj.weight ?? null,
    seal_material: dj.sealMaterial || null,
    housing_material: dj.housingMaterial || null,
    iso_test_method: dj.isoTestMethod || null,
    operating_temperature_min_c: dj.operating_temperature_min_c ?? null,
    operating_temperature_max_c: dj.operating_temperature_max_c ?? null,
    hydrostatic_burst_psi: dj.hydrostatic_burst_psi ?? null,
    operating_pressure_min_psi: dj.operating_pressure_min_psi ?? null,
    operating_pressure_max_psi: dj.operating_pressure_max_psi ?? null,
    dirt_capacity_grams: dj.dirt_capacity_grams ?? null,
    water_separation_efficiency_percent: dj.water_separation_efficiency_percent ?? null,
    fluid_compatibility: dj.fluid_compatibility ?? null,
    pleat_count: dj.pleat_count ?? null,
    service_life_hours: dj.service_life_hours ?? null,
    change_interval_km: dj.change_interval_km ?? null,
  };

  // Lists
  // MODIFICADO: descartar manufacturerName y usar solo códigos (partNumber)
  const crossCodes = cross.map(x => x?.partNumber).filter(Boolean);
  const appsJoin = joinList(apps, '; ');
  const engineJoin = joinList(engineApps, '; ');

  const lists_sheet = {
    // oem_codes: solo los códigos (partNumber), separados por coma
    oem_codes: joinList(crossCodes, ', '),
    // cross_reference: valor neutro para proteger nombres de fabricantes
    cross_reference: (crossCodes.length > 1) ? 'Multi-Referencia OEM' : '',
    equipment_applications: appsJoin,
    engine_applications: engineJoin,
  };
  const lists_mongo = {
    // Guardar solo códigos en Mongo, sin manufacturerName
    oem_codes: crossCodes,
    cross_reference: crossCodes.map(code => ({ code })),
    equipment_applications: apps,
    engine_applications: engineApps,
  };

  const description = dj.productDescription || dj.productType || null;

  return { technical, lists_sheet, lists_mongo, description };
}

//
// Compute ELIMFILTERS tecnologia_aplicada based on Fleetguard JSON keywords and filter family
// Priority: High Performance → Specialized → Standard
//
function computeElimfiltersTechnology(dj, familyRaw) {
  const family = String(familyRaw || dj.productFamily || dj.productType || '').toUpperCase();
  const textPool = [
    dj.productDescription,
    dj.productType,
    dj.mediaType,
    dj.filterNotes,
    dj.features,
  ]
    .map(s => String(s || '').toLowerCase())
    .join(' | ');

  const hasAny = (arr) => arr.some(k => textPool.includes(k.toLowerCase()));

  const isAir = /\bAIR\b|\bAIRE\b/.test(family);
  const isCabin = /\bCABIN\b/.test(family);
  const isFuel = /\bFUEL\b|\bCOMBUSTIBLE\b/.test(family);
  const isOil = /\bOIL\b|\bACEITE\b|\bLUBE\b/.test(family);
  const isHydraulic = /\bHYDRAULIC\b|\bHIDRAULIC\b|\bHIDRAULICO\b|\bHIDRAULICO\b/.test(family);
  const isCoolant = /\bCOOLANT\b|\bREFRIGERANT(E)?\b/.test(family);
  const isAirDryer = /\bAIR DRYER\b|\bSECADOR\b/.test(family);

  // 1) Alto Rendimiento y Medios Avanzados
  if (isAir && hasAny(['nano', 'nanofiber', 'nanofibra', 'surface-loading', 'nanonet'])) {
    return 'MACROCORE™ NanoMax';
  }
  if ((isOil || isFuel) && hasAny(['multi-layer', 'stratapore', 'densidad gradual', 'microglass'])) {
    return 'ELIMTEK™ MultiCore';
  }
  if (isHydraulic && hasAny(['microglass', 'high-efficiency synthetic'])) {
    return 'HydroFlow 5000';
  }

  // 2) Sistemas Especializados
  if (isFuel && hasAny(['water separator', 'separador de agua', 'coalescing', 'coalescente'])) {
    return 'AquaCore Pro';
  }
  if (isCoolant && hasAny(['dca', 'chemical release', 'refrigerante', 'coolant additive', 'fleetcool'])) {
    return 'ThermoRelease™';
  }
  if (isAirDryer && hasAny(['air dryer', 'desiccant cartridge', 'cartucho desecante'])) {
    return 'AeroDry Max';
  }
  if (isCabin && hasAny(['activated carbon', 'carbón activado', 'carbon activado', 'anti-gas', 'antigas'])) {
    return 'MICROKAPPA™';
  }

  // 3) Rendimiento Estándar
  if ((isOil || isFuel) && hasAny(['celulosa/synthetic blend', 'synthetic blend', 'fibras mixtas', 'blend'])) {
    return 'ELIMTEK™ Blend';
  }
  if ((isOil || isFuel) && (hasAny(['celulosa', 'paper media']) || !hasAny(['synthetic', 'nano', 'nanofiber', 'microglass', 'stratapore']))) {
    return 'ELIMTEK™ Standard';
  }
  if (isAir) {
    // Air standard when no NanoMax keywords
    return 'MACROCORE™';
  }

  // Fallback by family
  if (isCabin) return 'MICROKAPPA™';
  if (isHydraulic || isCoolant || isFuel || isOil || isAirDryer) return 'ELIMTEK™ Standard';

  return 'ELIMTEK™ Standard';
}

/**
 * Enrich masterData with Fleetguard JSON according to spec.
 * - Keeps identifiers intact
 * - Fills technical fields when available
 * - Uses sheet-concatenated strings for Master
 * - Returns a mongo document payload with arrays
 * @param {object} masterData detection output with sku, duty, family, etc.
 * @param {object} options { codeDonaldson, skuInterno }
 */
async function enrichHDWithFleetguard(masterData, options) {
  const { codeDonaldson, skuInterno } = options || {};
  if (!codeDonaldson || !skuInterno) return { masterData, mongoDoc: null };

  // Fetch JSON (Phase 2)
  const dj = await fetchFleetguardJSON(codeDonaldson);
  // Phase 3: map and normalize
  const mapped = mapFleetguardToFinal(dj);

  // Merge into masterData (sheet-visible)
  const md = { ...masterData };
  md.attributes = { ...md.attributes };

  Object.assign(md.attributes, {
    height_mm: mapped.technical.height_mm ?? md.attributes.height_mm,
    outer_diameter_mm: mapped.technical.outer_diameter_mm ?? md.attributes.outer_diameter_mm,
    inner_diameter_mm: mapped.technical.inner_diameter_mm ?? md.attributes.inner_diameter_mm,
    gasket_od_mm: mapped.technical.gasket_od_mm ?? md.attributes.gasket_od_mm,
    gasket_id_mm: mapped.technical.gasket_id_mm ?? md.attributes.gasket_id_mm,
    thread_size: mapped.technical.thread_size ?? md.attributes.thread_size,
    micron_rating: mapped.technical.micron_rating ?? md.attributes.micron_rating,
    bypass_valve_psi: mapped.technical.bypass_valve_psi ?? md.attributes.bypass_valve_psi,
    rated_flow_gpm: mapped.technical.rated_flow_gpm ?? md.attributes.rated_flow_gpm,
    weight_grams: mapped.technical.weight_grams ?? md.attributes.weight_grams,
    seal_material: mapped.technical.seal_material ?? md.attributes.seal_material,
    housing_material: mapped.technical.housing_material ?? md.attributes.housing_material,
    iso_test_method: mapped.technical.iso_test_method ?? md.attributes.iso_test_method,
    operating_temperature_min_c: mapped.technical.operating_temperature_min_c ?? md.attributes.operating_temperature_min_c,
    operating_temperature_max_c: mapped.technical.operating_temperature_max_c ?? md.attributes.operating_temperature_max_c,
    hydrostatic_burst_psi: mapped.technical.hydrostatic_burst_psi ?? md.attributes.hydrostatic_burst_psi,
    operating_pressure_min_psi: mapped.technical.operating_pressure_min_psi ?? md.attributes.operating_pressure_min_psi,
    operating_pressure_max_psi: mapped.technical.operating_pressure_max_psi ?? md.attributes.operating_pressure_max_psi,
    dirt_capacity_grams: mapped.technical.dirt_capacity_grams ?? md.attributes.dirt_capacity_grams,
    water_separation_efficiency_percent: mapped.technical.water_separation_efficiency_percent ?? md.attributes.water_separation_efficiency_percent,
    fluid_compatibility: mapped.technical.fluid_compatibility ?? md.attributes.fluid_compatibility,
    pleat_count: mapped.technical.pleat_count ?? md.attributes.pleat_count,
    service_life_hours: mapped.technical.service_life_hours ?? md.attributes.service_life_hours,
    change_interval_km: mapped.technical.change_interval_km ?? md.attributes.change_interval_km,
  });

  // Lists for sheet (concatenated)
  md.oem_codes = mapped.lists_sheet.oem_codes || md.oem_codes;
  md.cross_reference = mapped.lists_sheet.cross_reference || md.cross_reference;
  md.equipment_applications = mapped.lists_sheet.equipment_applications || md.equipment_applications;
  md.engine_applications = mapped.lists_sheet.engine_applications || md.engine_applications;

  // Optional description override
  md.description = mapped.description || md.description;

  // Tecnologia aplicada (ELIMFILTERS) basada en JSON Fleetguard + familia
  const familyForTech = md.family || md.filter_type || md.type;
  const tecnologia = computeElimfiltersTechnology(dj, familyForTech);
  if (tecnologia) {
    md.attributes.tecnologia_aplicada = tecnologia;
  }

  // EK5 Kits (HD only): process Fleetguard maintenance kits and store anonymized kit docs
  try {
    const dutyIsHD = String(md.duty || md.duty_type || '').toUpperCase() === 'HD';
    if (dutyIsHD && Array.isArray(dj.maintenanceKits) && dj.maintenanceKits.length > 0) {
      console.log(`Procesando Kits HD (EK5) para ${skuInterno}...`);
      await processHDKits(dj.maintenanceKits);
      // Guardar en hoja separada KITS_EK5
      for (const kit of dj.maintenanceKits) {
        // --- 🛑 FILTRO DE OBSOLETOS ---
        const statusRaw = `${kit?.lifecycleStatus || ''} ${kit?.status || ''} ${kit?.statusDescription || ''}`.toUpperCase();
        if (statusRaw.includes('OBSOLETE') || statusRaw.includes('DISCONTINUED')) {
          console.log(`[INFO] Kit ignorado por ser obsoleto (sheet): ${kit?.partNumber || 'N/A'}`);
          continue;
        }
        const newKitSku = deriveEk5Sku(kit?.partNumber);
        if (!newKitSku) continue;
        const { descripcion_contenido } = summarizeComponents(kit?.components || kit?.items || []);
        const sheetRowData = {
          'SKU': newKitSku,
          'Tipo de Producto': 'Kit de Mantenimiento',
          'Contenido del Kit': descripcion_contenido,
          'Tecnología': 'ELIMTEK™ Standard',
          'Filtro Principal (Ref)': skuInterno,
          'Duty': 'HD'
        };
        try { await saveKitToSheet(sheetRowData); } catch (e) { console.log(`⚠️  Save kit to sheet failed: ${e.message}`); }
      }
    }
  } catch (kitErr) {
    console.log(`⚠️  EK5 kit processing skipped: ${kitErr.message}`);
  }

  // Mongo document (arrays preserved)
  const mongoDoc = {
    code_client: md.query_normalized || md.query,
    code_oem: codeDonaldson,
    duty: md.duty || md.duty_type,
    family: md.family || md.filter_type || md.type,
    sku: skuInterno,
    media: md.media || md.media_type,
    source: 'FLEETGUARD_ENRICHMENT',
    cross_reference: mapped.lists_mongo.cross_reference,
    applications: [
      ...(Array.isArray(mapped.lists_mongo.equipment_applications) ? mapped.lists_mongo.equipment_applications : []),
      ...(Array.isArray(mapped.lists_mongo.engine_applications) ? mapped.lists_mongo.engine_applications : []),
    ],
    attributes: { ...md.attributes },
    timestamp: new Date(),
  };

  return { masterData: md, mongoDoc };
}

module.exports = {
  fetchFleetguardJSON,
  mapFleetguardToFinal,
  enrichHDWithFleetguard,
};