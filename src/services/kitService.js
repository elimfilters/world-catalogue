'use strict';

const { connect } = require('./mongoService');

const KIT_PREFIX_HD = 'EK5';

const FAMILY_MAP = {
  LUBE: 'Filtro de Aceite',
  OIL: 'Filtro de Aceite',
  FUEL: 'Filtro de Combustible',
  AIR: 'Filtro de Aire',
  HYDRAULIC: 'Filtro Hidráulico',
  COOLANT: 'Filtro de Refrigerante',
};

function translateFamily(name) {
  const key = String(name || '').trim().toUpperCase();
  return FAMILY_MAP[key] || 'Componente';
}

function deriveEk5Sku(partNumber) {
  const digits = String(partNumber || '').replace(/[^0-9]/g, '');
  if (!digits) return null;
  const last4 = digits.slice(-4).padStart(4, '0');
  return `${KIT_PREFIX_HD}${last4}`;
}

function summarizeComponents(components) {
  const acc = new Map();
  for (const c of Array.isArray(components) ? components : []) {
    const tipo = translateFamily(c?.family || c?.type);
    const cantidad = Number(c?.qty ?? c?.quantity ?? 1) || 1;
    acc.set(tipo, (acc.get(tipo) || 0) + cantidad);
  }
  const contenido_estructurado = Array.from(acc.entries()).map(([tipo, cantidad]) => ({ tipo, cantidad }));
  const descripcion_contenido = contenido_estructurado.map(x => `${x.tipo} (${x.cantidad})`).join('; ');
  return { contenido_estructurado, descripcion_contenido };
}

async function processHDKits(maintenanceKits) {
  const db = await connect();
  if (!db) return { saved: 0 };
  const col = db.collection('maintenance_kits');
  let saved = 0;
  for (const kit of Array.isArray(maintenanceKits) ? maintenanceKits : []) {
    // --- 🛑 FILTRO DE OBSOLETOS ---
    const statusRaw = `${kit?.lifecycleStatus || ''} ${kit?.status || ''} ${kit?.statusDescription || ''}`.toUpperCase();
    if (statusRaw.includes('OBSOLETE') || statusRaw.includes('DISCONTINUED')) {
      console.log(`[INFO] Kit ignorado por ser obsoleto: ${kit?.partNumber || 'N/A'}`);
      continue;
    }
    const ek5 = deriveEk5Sku(kit?.partNumber);
    if (!ek5) continue;
    const { contenido_estructurado, descripcion_contenido } = summarizeComponents(kit?.components || kit?.items || []);
    const doc = {
      _id: ek5,
      sku_interno: ek5,
      duty: 'HD',
      tipo_producto: 'Kit de Mantenimiento',
      descripcion_contenido,
      contenido_estructurado,
      tecnologia_aplicada: 'ELIMTEK™ Standard',
      created_at: new Date(),
      updated_at: new Date(),
    };
    await col.updateOne({ _id: ek5 }, { $set: doc }, { upsert: true });
    saved += 1;
  }
  return { saved };
}

module.exports = {
  processHDKits,
  KIT_PREFIX_HD,
  // Export helpers for reuse in sheet integration
  deriveEk5Sku,
  summarizeComponents,
};