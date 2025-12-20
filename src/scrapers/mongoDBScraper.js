// src/scrapers/mongoDBScraper.js
const { MongoClient } = require('mongodb');

class MongoDBScraper {
  constructor() {
    this.name = 'MongoDB Scraper';
    this.client = null;
    this.db = null;
    this.collection = null;
    this.isConnected = false;
  }

  /**
   * Conectar a MongoDB
   */
  async connect() {
    if (this.isConnected) return;

    try {
      const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
      const dbName = process.env.MONGODB_DB || 'elimfilters';
      
      this.client = new MongoClient(uri);
      await this.client.connect();
      
      this.db = this.client.db(dbName);
      this.collection = this.db.collection('filters');
      
      // Crear índices para búsquedas rápidas
      await this.collection.createIndex({ sku: 1 }, { unique: true });
      await this.collection.createIndex({ prefix: 1 });
      await this.collection.createIndex({ brand: 1 });
      await this.collection.createIndex({ family: 1 });
      await this.collection.createIndex({ 'equipment_applications.equipment_brand': 1 });
      
      this.isConnected = true;
      console.log('[MongoDB Scraper] ✅ Conectado exitosamente');
    } catch (error) {
      console.error('[MongoDB Scraper] ❌ Error de conexión:', error.message);
      throw error;
    }
  }

  /**
   * Buscar filtro por SKU
   * @param {string} sku - SKU del filtro
   * @returns {Promise<Object|null>}
   */
  async findBySKU(sku) {
    await this.connect();
    
    try {
      const normalizedSKU = sku.trim().toUpperCase();
      console.log(`[MongoDB Scraper] Buscando SKU: ${normalizedSKU}`);
      
      const filter = await this.collection.findOne({ 
        sku: normalizedSKU,
        status: 'active'
      });
      
      if (filter) {
        console.log(`[MongoDB Scraper] ✅ SKU encontrado: ${normalizedSKU}`);
        return this._formatDocument(filter);
      }
      
      console.log(`[MongoDB Scraper] ❌ SKU no encontrado: ${normalizedSKU}`);
      return null;
    } catch (error) {
      console.error('[MongoDB Scraper] Error en findBySKU:', error.message);
      return null;
    }
  }

  /**
   * Buscar filtros por prefix
   * @param {string} prefix - Prefijo del SKU
   * @returns {Promise<Array>}
   */
  async findByPrefix(prefix) {
    await this.connect();
    
    try {
      const normalizedPrefix = prefix.trim().toUpperCase();
      console.log(`[MongoDB Scraper] Buscando prefix: ${normalizedPrefix}`);
      
      const filters = await this.collection
        .find({ 
          prefix: normalizedPrefix,
          status: 'active'
        })
        .limit(100)
        .toArray();
      
      console.log(`[MongoDB Scraper] ✅ Encontrados ${filters.length} filtros`);
      return filters.map(f => this._formatDocument(f));
    } catch (error) {
      console.error('[MongoDB Scraper] Error en findByPrefix:', error.message);
      return [];
    }
  }

  /**
   * Buscar filtros por equipo
   * @param {string} equipmentBrand - Marca del equipo
   * @param {string} equipmentModel - Modelo del equipo
   * @returns {Promise<Array>}
   */
  async findByEquipment(equipmentBrand, equipmentModel) {
    await this.connect();
    
    try {
      console.log(`[MongoDB Scraper] Buscando equipo: ${equipmentBrand} ${equipmentModel}`);
      
      const filters = await this.collection
        .find({
          'equipment_applications.equipment_brand': new RegExp(equipmentBrand, 'i'),
          'equipment_applications.equipment_model': new RegExp(equipmentModel, 'i'),
          status: 'active'
        })
        .limit(50)
        .toArray();
      
      console.log(`[MongoDB Scraper] ✅ Encontrados ${filters.length} filtros compatibles`);
      return filters.map(f => this._formatDocument(f));
    } catch (error) {
      console.error('[MongoDB Scraper] Error en findByEquipment:', error.message);
      return [];
    }
  }

  /**
   * Insertar o actualizar filtro
   * @param {Object} filterData - Datos del filtro
   * @returns {Promise<Object>}
   */
  async upsertFilter(filterData) {
    await this.connect();
    
    try {
      const sku = filterData.sku.trim().toUpperCase();
      
      const result = await this.collection.updateOne(
        { sku },
        {
          $set: {
            ...filterData,
            sku,
            updated_at: new Date()
          },
          $setOnInsert: {
            created_at: new Date(),
            status: 'active'
          }
        },
        { upsert: true }
      );
      
      console.log(`[MongoDB Scraper] ✅ Filtro ${result.upsertedCount ? 'insertado' : 'actualizado'}: ${sku}`);
      return result;
    } catch (error) {
      console.error('[MongoDB Scraper] Error en upsertFilter:', error.message);
      throw error;
    }
  }

  /**
   * Obtener estadísticas
   * @returns {Promise<Object>}
   */
  async getStats() {
    await this.connect();
    
    try {
      const totalFilters = await this.collection.countDocuments({ status: 'active' });
      const totalBrands = await this.collection.distinct('brand');
      const totalPrefixes = await this.collection.distinct('prefix');
      
      return {
        total_filters: totalFilters,
        total_brands: totalBrands.length,
        total_prefixes: totalPrefixes.length,
        last_updated: new Date().toISOString()
      };
    } catch (error) {
      console.error('[MongoDB Scraper] Error en getStats:', error.message);
      return {};
    }
  }

  /**
   * Formatear documento de MongoDB
   * @private
   */
  _formatDocument(doc) {
    if (!doc) return null;
    
    // Remover _id de MongoDB para la respuesta
    const { _id, ...filter } = doc;
    return filter;
  }

  /**
   * Cerrar conexión
   */
  async close() {
    if (this.client) {
      await this.client.close();
      this.isConnected = false;
      console.log('[MongoDB Scraper] Conexión cerrada');
    }
  }
}

module.exports = new MongoDBScraper();
