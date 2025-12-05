// ============================================================================
// MONGODB SERVICE - Minimal, resilient implementation
// Provides caching helpers used by detection/sync services.
// If `MONGODB_URI` is not set, functions degrade gracefully.
// ============================================================================

const { MongoClient } = require('mongodb');

let client = null;
let db = null;
let filtersCollection = null;

const COLLECTION_NAME = 'master_catalog';

function hasMongoEnv() {
  return !!process.env.MONGODB_URI;
}

async function connect() {
  if (!hasMongoEnv()) {
    console.log('ℹ️  MongoDB disabled: MONGODB_URI not set');
    return null;
  }
  if (client && client.topology && client.topology.isConnected()) {
    return db;
  }
  const mongoUri = process.env.MONGODB_URI;
  client = new MongoClient(mongoUri, {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
  });
  await client.connect();
  db = client.db();
  filtersCollection = db.collection(COLLECTION_NAME);
  try {
    // Índices para rendimiento
    await filtersCollection.createIndex({ code_client: 1 });
    await filtersCollection.createIndex({ code_oem: 1 });
    await filtersCollection.createIndex({ sku: 1 });
    await filtersCollection.createIndex({ duty: 1, family: 1 });
    await filtersCollection.createIndex({ timestamp: -1 });
    // Clave única: normsku
    await filtersCollection.createIndex({ normsku: 1 }, { unique: true });
    // Índice de texto para búsqueda catálogo: equipment_applications + engine_applications
    try {
      // Eliminar cualquier índice de texto existente para crear uno compuesto
      const idx = await filtersCollection.indexes();
      const textNames = (Array.isArray(idx) ? idx : []).filter(ix => {
        const k = ix && ix.key ? Object.values(ix.key) : [];
        return Array.isArray(k) && k.some(v => String(v).toLowerCase() === 'text');
      }).map(ix => ix.name).filter(Boolean);
      for (const name of textNames) {
        try { await filtersCollection.dropIndex(name); } catch (_) {}
      }
      await filtersCollection.createIndex({ equipment_applications: 'text', engine_applications: 'text' }, { name: 'fts_equipment_engine' });
    } catch (_) {}
  } catch (e) {
    console.log('⚠️  Index creation skipped:', e.message);
  }
  console.log('✅ MongoDB connected');
  return db;
}

async function disconnect() {
  try {
    if (client) {
      await client.close();
      client = null; db = null; filtersCollection = null;
      console.log('✅ MongoDB disconnected');
    }
  } catch (e) {
    console.log('⚠️  MongoDB disconnect error:', e.message);
  }
}

// Read operations
async function searchCache(code) {
  try {
    if (!hasMongoEnv()) return null;
    await connect();
    const normalized = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const result = await filtersCollection.findOne({
      $or: [
        { code_client_normalized: normalized },
        { code_oem_normalized: normalized },
      ],
    });
    if (!result) return null;
    return {
      found: true,
      cached: true,
      code_client: result.code_client,
      code_oem: result.code_oem,
      duty: result.duty,
      family: result.family,
      sku: result.sku,
      media: result.media,
      source: result.source,
      cross_reference: result.cross_reference || [],
      applications: result.applications || [],
      attributes: result.attributes || {},
      timestamp: result.timestamp,
      _id: result._id,
    };
  } catch (e) {
    console.log('⚠️  Cache search error:', e.message);
    return null;
  }
}

async function getAllFilters(filter = {}, limit = 100) {
  try {
    if (!hasMongoEnv()) return [];
    await connect();
    return await filtersCollection
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
  } catch (e) {
    console.log('⚠️  getAllFilters error:', e.message);
    return [];
  }
}

// Full-text catalog search over equipment/engine applications
async function searchCatalogByText(term, { limit = 20, page = 1, project = null } = {}) {
  try {
    if (!hasMongoEnv()) return [];
    await connect();
    const q = String(term || '').trim();
    if (!q) return [];
    const skip = Math.max(0, (Number(page) - 1) * Number(limit));
    const baseProjection = {
      normsku: 1,
      sku: 1,
      code_client: 1,
      code_oem: 1,
      family: 1,
      duty: 1,
      equipment_applications: 1,
      engine_applications: 1,
      oem_codes: 1,
      cross_reference: 1,
      media: 1,
      source: 1,
      timestamp: 1,
      score: { $meta: 'textScore' }
    };
    const projection = project && typeof project === 'object' ? { ...baseProjection, ...project } : baseProjection;

    const cursor = filtersCollection
      .find({ $text: { $search: q } }, { projection })
      .sort({ score: { $meta: 'textScore' } })
      .skip(skip)
      .limit(Number(limit));

    const results = await cursor.toArray();
    return results.map(doc => ({
      score: doc.score,
      normsku: doc.normsku,
      sku: doc.sku,
      code_client: doc.code_client,
      code_oem: doc.code_oem,
      family: doc.family,
      duty: doc.duty,
      equipment_applications: Array.isArray(doc.equipment_applications) ? doc.equipment_applications : [],
      engine_applications: Array.isArray(doc.engine_applications) ? doc.engine_applications : [],
      oem_codes: Array.isArray(doc.oem_codes) ? doc.oem_codes : [],
      cross_reference: Array.isArray(doc.cross_reference) ? doc.cross_reference : [],
      media: doc.media,
      source: doc.source,
      timestamp: doc.timestamp
    }));
  } catch (e) {
    console.log('⚠️  searchCatalogByText error:', e.message);
    return [];
  }
}

// Write operations
async function saveToCache(data) {
  try {
    if (!hasMongoEnv()) return null;
    await connect();
    const normalizedClient = (data.query || data.code_client || '')
      .toUpperCase().replace(/[^A-Z0-9]/g, '');
    const normalizedOEM = (data.oem_equivalent || data.code_oem || '')
      .toUpperCase().replace(/[^A-Z0-9]/g, '');
    const existing = await filtersCollection.findOne({
      $or: [
        { code_client_normalized: normalizedClient },
        { code_oem_normalized: normalizedOEM },
      ],
    });
    if (existing) return existing;
    const toArray = (v) => {
      if (!v) return [];
      if (Array.isArray(v)) return v;
      // Regla definitiva: dividir por coma + espacio
      return String(v).split(', ').map(s => s.trim()).filter(Boolean);
    };

    // Guardrail de Persistencia: VOL_LOW
    const eqAppsArr = Array.isArray(data.equipment_applications) ? data.equipment_applications : toArray(data.equipment_applications);
    const enAppsArr = Array.isArray(data.engine_applications) ? data.engine_applications : toArray(data.engine_applications || data.applications);
    const uniq = (arr) => new Set((Array.isArray(arr) ? arr : []).map(s => String(s || '').toLowerCase())).size;
    const eqCount = uniq(eqAppsArr);
    const enCount = uniq(enAppsArr);
    const minRequired = 6;
    if (eqCount < minRequired || enCount < minRequired) {
      const msg = `VOL_LOW: insufficient applications (equipment=${eqCount}, engine=${enCount}, min=${minRequired})`;
      console.log(`⚠️  ${msg}`);
      const err = new Error(msg);
      err.code = 'VOL_LOW';
      err.status = 400;
      throw err;
    }

    const document = {
      code_client: data.query || data.code_client,
      code_client_normalized: normalizedClient,
      normsku: data.normsku || normalizedClient,
      code_oem: data.oem_equivalent || data.code_oem,
      code_oem_normalized: normalizedOEM,
      duty: data.duty,
      family: data.family,
      sku: data.sku,
      media: data.media,
      source: data.source,
      oem_codes: toArray(data.oem_codes),
      cross_reference: toArray(data.cross_reference),
      engine_applications: Array.isArray(data.engine_applications) ? data.engine_applications : toArray(data.engine_applications),
      equipment_applications: Array.isArray(data.equipment_applications) ? data.equipment_applications : toArray(data.equipment_applications),
      manufacturing_standards: toArray(data.manufacturing_standards),
      certification_standards: toArray(data.certification_standards),
      applications: Array.isArray(data.applications) ? data.applications : toArray(data.applications),
      attributes: data.attributes || {},
      timestamp: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    };
    return await filtersCollection.insertOne(document);
  } catch (e) {
    if (String(e?.code).toUpperCase() === 'VOL_LOW' || e?.status === 400 || /VOL_LOW/i.test(String(e?.message || ''))) {
      // Propagar el error de calidad para que el caller devuelva 400
      throw e;
    }
    console.log('⚠️  saveToCache error:', e.message);
    return null;
  }
}

// Placeholders for optional APIs used elsewhere
async function updateCache() { /* no-op */ }
async function deleteFromCache() { /* no-op */ }
async function getCacheStats() { return null; }
async function clearCache() { return 0; }

module.exports = {
  connect,
  disconnect,
  searchCache,
  saveToCache,
  updateCache,
  deleteFromCache,
  getAllFilters,
  searchCatalogByText,
  getCacheStats,
  clearCache,
};