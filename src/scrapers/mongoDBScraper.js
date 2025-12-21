// ============================================================================
// MongoDB Scraper — ELIMFILTERS (SAFE VERSION)
// Rol:
// - Lectura de SKUs ELIMFILTERS
// - Persistencia controlada
// - NUNCA inventa datos
// - FALLA DE FORMA CONTROLADA si MongoDB no está disponible
// ============================================================================

let MongoClient;
try {
  ({ MongoClient } = require('mongodb'));
} catch (err) {
  console.error('❌ MongoDB dependency not installed. MongoDBScraper disabled.');
  MongoClient = null;
}

class MongoDBScraper {
  constructor() {
    this.name = 'MongoDB Scraper';
    this.client = null;
    this.db = null;
    this.collection = null;
    this.isConnected = false;
    this.disabled = MongoClient === null;
  }

  // --------------------------------------------------------------------------
  // Conectar a MongoDB
  // --------------------------------------------------------------------------
  async connect() {
    if (this.disabled) {
      throw new Error('MongoDB dependency not available');
    }

    if (this.isConnected) return;

    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.MONGODB_DB || 'elimfilters';

    this.client = new MongoClient(uri);
    await this.client.connect();

    this.db = this.client.db(dbName);
    this.collection = this.db.collection('filters');

    // Índices
    await this.collection.createIndex({ sku: 1 }, { unique: true });
    await this.collection.createIndex({ prefix: 1 });
    await this.collection.createIndex({ brand: 1 });
    await this.collection.createIndex({ family: 1 });
    await this.collection.createIndex({ 'equipment_applications.equipment_brand': 1 });

    this.isConnected = true;
    console.log('[MongoDBScraper] ✅ Connected');
  }

  // --------------------------------------------------------------------------
  // Buscar por SKU ELIMFILTERS
  // --------------------------------------------------------------------------
  async findBySKU(sku) {
    if (this.disabled) return null;

    await this.connect();

    const normalizedSKU = String(sku).trim().toUpperCase();
    const doc = await this.collection.findOne({
      sku: normalizedSKU,
      status: 'active'
    });

    return doc ? this._format(doc) : null;
  }

  // --------------------------------------------------------------------------
  // Buscar por prefijo ELIMFILTERS
  // --------------------------------------------------------------------------
  async findByPrefix(prefix) {
    if (this.disabled) return [];

    await this.connect();

    const normalized = String(prefix).trim().toUpperCase();
    const docs = await this.collection
      .find({ prefix: normalized, status: 'active' })
      .limit(100)
      .toArray();

    return docs.map(d => this._format(d));
  }

  // --------------------------------------------------------------------------
  // Buscar por equipo
  // --------------------------------------------------------------------------
  async findByEquipment(brand, model) {
    if (this.disabled) return [];

    await this.connect();

    const docs = await this.collection.find({
      'equipment_applications.equipment_brand': new RegExp(brand, 'i'),
      'equipment_applications.equipment_model': new RegExp(model, 'i'),
      status: 'active'
    }).limit(50).toArray();

    return docs.map(d => this._format(d));
  }

  // --------------------------------------------------------------------------
  // Upsert controlado
  // --------------------------------------------------------------------------
  async upsertFilter(filterData) {
    if (this.disabled) {
      throw new Error('MongoDB not available');
    }

    await this.connect();

    const sku = filterData.sku.trim().toUpperCase();

    return this.collection.updateOne(
      { sku },
      {
        $set: { ...filterData, sku, updated_at: new Date() },
        $setOnInsert: { created_at: new Date(), status: 'active' }
      },
      { upsert: true }
    );
  }

  // --------------------------------------------------------------------------
  // Stats
  // --------------------------------------------------------------------------
  async getStats() {
    if (this.disabled) {
      return { enabled: false };
    }

    await this.connect();

    return {
      total_filters: await this.collection.countDocuments({ status: 'active' }),
      total_brands: (await this.collection.distinct('brand')).length,
      total_prefixes: (await this.collection.distinct('prefix')).length,
      last_updated: new Date().toISOString()
    };
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------
  _format(doc) {
    const { _id, ...clean } = doc;
    return clean;
  }

  async close() {
    if (this.client) {
      await this.client.close();
      this.isConnected = false;
    }
  }
}

module.exports = new MongoDBScraper();
