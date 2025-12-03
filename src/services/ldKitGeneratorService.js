"use strict";

// LD Kit Generator Service (EK3)
// Creates maintenance kits based on VIN application map for LD vehicles.
// SKU formula: EK3 + LAST4(OIL dealer_oem_code) + LAST4(AIR dealer_oem_code)

const { connect } = require('./mongoService');
const vinMapService = require('./vinApplicationMapService');
const { searchCache } = require('./mongoService');
const { saveKitToSheetLD } = require('./syncSheetsService');

const KIT_PREFIX_LD = 'EK3';

const FAMILY_MAP_LD = {
  OIL: 'Filtro de Aceite',
  AIR: 'Filtro de Aire',
  CABIN: 'Filtro de Cabina',
  FUEL: 'Filtro de Combustible',
  TRANSMISSION: 'Filtro de Transmisión',
};

function cleanLast4(code) {
  if (!code) return null;
  const cleaned = String(code).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!cleaned) return null;
  return cleaned.slice(-4);
}

function deriveEk3Sku(oilCode, airCode) {
  const lastOil = cleanLast4(oilCode);
  const lastAir = cleanLast4(airCode);
  if (!lastOil || !lastAir) return null;
  return `${KIT_PREFIX_LD}${lastOil}${lastAir}`;
}

async function findSkuRealByOem(oemCode) {
  try {
    const res = await searchCache(oemCode);
    return res?.sku || null;
  } catch (_) { return null; }
}

function summarizeContenido(components) {
  const items = Array.isArray(components) ? components : [];
  const counts = {};
  for (const it of items) {
    const t = String(it.tipo || '').trim();
    if (!t) continue;
    counts[t] = (counts[t] || 0) + (Number(it.cantidad || 1) || 1);
  }
  const parts = Object.entries(counts).map(([tipo, qty]) => `${tipo} (${qty})`);
  return parts.join('; ');
}

/**
 * Generate EK3 kit for a decoded vehicle and upsert into Mongo + Sheets
 * @param {object} vehicleInfo { make, model, year, engine: { displacement_l } }
 * @returns {object} { sku, savedMongo: boolean, savedSheet: boolean }
 */
async function generateEk3Kit(vehicleInfo) {
  // Fetch OEM target codes by filter type from vin_application_map
  const mappings = await vinMapService.findByDecoded(vehicleInfo);
  if (!Array.isArray(mappings) || mappings.length === 0) {
    return { sku: null, savedMongo: false, savedSheet: false, reason: 'VIN map not found' };
  }

  const codeByType = {};
  for (const m of mappings) {
    const t = String(m.filter_type || '').toUpperCase();
    codeByType[t] = m.oem_code_target || codeByType[t] || null;
  }

  const oilCode = codeByType['OIL'];
  const airCode = codeByType['AIR'];
  const ek3 = deriveEk3Sku(oilCode, airCode);
  if (!ek3) {
    return { sku: null, savedMongo: false, savedSheet: false, reason: 'Missing oil/air OEM codes' };
  }

  // Build contenido_estructurado across all available types
  const tiposOrden = ['OIL', 'AIR', 'CABIN', 'FUEL', 'TRANSMISSION'];
  const contenido = [];
  for (const t of tiposOrden) {
    const ref = codeByType[t];
    if (!ref) continue;
    const skuReal = await findSkuRealByOem(ref);
    contenido.push({
      tipo: FAMILY_MAP_LD[t] || t,
      referencia_oem: String(ref).toUpperCase(),
      sku_real: skuReal,
      cantidad: 1,
    });
  }

  const descripcion_contenido = summarizeContenido(contenido);
  const mk = vinMapService.normalizeMake(vehicleInfo.make);
  const md = vinMapService.normalizeModel(vehicleInfo.model);
  const yr = vinMapService.normalizeYear(vehicleInfo.year);
  const eng = vinMapService.normalizeEngineLiters(vehicleInfo.engine?.displacement_l || vehicleInfo.engine_liters);
  const aplicaciones_compatibles = [`${mk} ${md} ${eng} (${yr})`];

  // Upsert into Mongo maintenance_kits
  const db = await connect();
  const col = db?.collection('maintenance_kits');
  if (!col) {
    return { sku: ek3, savedMongo: false, savedSheet: false, reason: 'Mongo disabled' };
  }
  const doc = {
    _id: ek3,
    sku_interno: ek3,
    duty: 'LD',
    tipo_producto: 'Kit de Mantenimiento LD',
    descripcion_contenido,
    contenido_estructurado: contenido,
    aplicaciones_compatibles,
    tecnologia_aplicada: 'ELIMTEK™ Blend',
    created_at: new Date(),
    updated_at: new Date(),
  };
  await col.updateOne({ _id: ek3 }, { $set: doc }, { upsert: true });

  // Save to Google Sheets (KITS_EK3)
  try {
    const sheetRow = {
      'SKU': ek3,
      'Tipo de Producto': 'Kit de Mantenimiento LD',
      'Contenido del Kit': descripcion_contenido,
      'Tecnología': 'ELIMTEK™ Blend',
      'Filtro Principal (Ref)': String(oilCode || '').toUpperCase(),
      'Duty': 'LD'
    };
    await saveKitToSheetLD(sheetRow);
  } catch (e) {
    // Sheets failure should not block Mongo persistence
  }

  return { sku: ek3, savedMongo: true, savedSheet: true };
}

module.exports = {
  generateEk3Kit,
  deriveEk3Sku,
};