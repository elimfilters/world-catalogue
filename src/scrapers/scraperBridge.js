// src/scrapers/scraperBridge.js
const googleSheetsScraper = require('./googleSheetsScraper');
const mongoDBScraper = require('./mongoDBScraper');

/**
 * ScraperBridge - Puente unificado para todos los scrapers
 * Soporta búsqueda universal de filtros para cualquier tipo de equipo con motor
 */
class ScraperBridge {
  constructor() {
    this.scrapers = [
      mongoDBScraper,
      googleSheetsScraper
    ];
    
    this.config = {
      enableCache: process.env.ENABLE_MONGODB_CACHE !== 'false',
      cacheToMongoDB: process.env.CACHE_TO_MONGODB !== 'false',
      maxRetries: 3,
      retryDelay: 1000
    };

    // Categorías de equipos soportadas
    this.equipmentCategories = {
      'heavy_machinery': ['excavator', 'bulldozer', 'loader', 'backhoe', 'grader', 'crane', 'forklift'],
      'diesel_vehicles': ['truck', 'bus', 'pickup', 'van', 'semi', 'trailer', 'lorry'],
      'gasoline_vehicles': ['car', 'suv', 'sedan', 'coupe', 'hatchback', 'minivan', 'wagon'],
      'marine': ['outboard', 'inboard', 'boat', 'yacht', 'jetski', 'watercraft', 'marine'],
      'generators': ['generator', 'genset', 'power unit', 'standby'],
      'agricultural': ['tractor', 'harvester', 'combine', 'planter', 'sprayer', 'baler'],
      'industrial': ['compressor', 'pump', 'engine', 'motor', 'turbine', 'blower'],
      'recreational': ['atv', 'utv', 'motorcycle', 'dirt bike', 'quad', 'side-by-side'],
      'aircraft': ['airplane', 'helicopter', 'aircraft', 'aviation', 'cessna', 'piper']
    };

    console.log('[ScraperBridge] Inicializado con', this.scrapers.length, 'scrapers');
    console.log('[ScraperBridge] Cache MongoDB:', this.config.enableCache ? '✅ Habilitado' : '❌ Deshabilitado');
  }

  /**
   * Busca datos de un filtro por SKU
   * @param {string} sku - SKU del filtro
   * @param {Object} options - Opciones de búsqueda
   * @returns {Promise<Object|null>}
   */
  async findBySKU(sku, options = {}) {
    if (!sku || typeof sku !== 'string') {
      console.warn('[ScraperBridge] SKU inválido:', sku);
      return null;
    }

    const normalizedSKU = sku.trim().toUpperCase();
    const startTime = Date.now();
    console.log(`[ScraperBridge] 🔍 Buscando SKU: ${normalizedSKU}`);

    let result = null;
    let foundInScraper = null;

    // Buscar en MongoDB primero (cache)
    if (this.config.enableCache && !options.skipCache) {
      try {
        console.log('[ScraperBridge] 📦 Buscando en MongoDB cache...');
        result = await mongoDBScraper.findBySKU(normalizedSKU);
        
        if (result) {
          foundInScraper = 'MongoDB (cache)';
          const elapsed = Date.now() - startTime;
          console.log(`[ScraperBridge] ✅ SKU encontrado en MongoDB cache (${elapsed}ms)`);
          return this._enrichData(result, normalizedSKU, foundInScraper);
        }
        
        console.log('[ScraperBridge] ⚠️ SKU no encontrado en MongoDB, buscando en otras fuentes...');
      } catch (error) {
        console.error('[ScraperBridge] ❌ Error en MongoDB cache:', error.message);
      }
    }

    // Buscar en otros scrapers
    for (const scraper of this.scrapers) {
      if (scraper === mongoDBScraper && this.config.enableCache) {
        continue;
      }

      try {
        console.log(`[ScraperBridge] 🔍 Buscando en ${scraper.name || 'scraper desconocido'}...`);
        const scraperResult = await this._retryOperation(
          () => scraper.findBySKU(normalizedSKU),
          this.config.maxRetries
        );

        if (scraperResult) {
          result = scraperResult;
          foundInScraper = scraper.name || 'unknown';
          const elapsed = Date.now() - startTime;
          console.log(`[ScraperBridge] ✅ SKU encontrado en ${foundInScraper} (${elapsed}ms)`);
          
          // Guardar en cache
          if (this.config.cacheToMongoDB && scraper !== mongoDBScraper) {
            this._cacheToMongoDB(result, normalizedSKU).catch(err => {
              console.error('[ScraperBridge] ⚠️ Error guardando en cache:', err.message);
            });
          }
          
          break;
        }
      } catch (error) {
        console.error(`[ScraperBridge] ❌ Error en ${scraper.name || 'scraper'}:`, error.message);
      }
    }

    if (!result) {
      const elapsed = Date.now() - startTime;
      console.log(`[ScraperBridge] ❌ SKU no encontrado: ${normalizedSKU} (${elapsed}ms)`);
      return null;
    }

    return this._enrichData(result, normalizedSKU, foundInScraper);
  }

  /**
   * Busca datos por prefix del SKU
   * @param {string} prefix - Prefijo del SKU
   * @param {Object} options - Opciones de búsqueda
   * @returns {Promise<Array>}
   */
  async findByPrefix(prefix, options = {}) {
    if (!prefix || typeof prefix !== 'string') {
      console.warn('[ScraperBridge] Prefix inválido:', prefix);
      return [];
    }

    const normalizedPrefix = prefix.trim().toUpperCase();
    const startTime = Date.now();
    console.log(`[ScraperBridge] 🔍 Buscando por prefix: ${normalizedPrefix}`);

    const prefixMap = require('../config/prefixMap');
    const prefixInfo = prefixMap.resolveBrandFamilyDutyByPrefix(normalizedPrefix);
    
    if (!prefixInfo) {
      console.warn(`[ScraperBridge] ⚠️ Prefix no reconocido: ${normalizedPrefix}`);
    } else {
      console.log(`[ScraperBridge] ℹ️ Prefix info:`, prefixInfo);
    }

    const allResults = [];
    const limit = options.limit || 100;

    for (const scraper of this.scrapers) {
      try {
        if (typeof scraper.findByPrefix === 'function') {
          console.log(`[ScraperBridge] 🔍 Buscando en ${scraper.name || 'scraper'}...`);
          
          const scraperResults = await this._retryOperation(
            () => scraper.findByPrefix(normalizedPrefix),
            this.config.maxRetries
          );

          if (Array.isArray(scraperResults) && scraperResults.length > 0) {
            console.log(`[ScraperBridge] ✅ Encontrados ${scraperResults.length} resultados en ${scraper.name}`);
            
            const enrichedResults = scraperResults.map(r => 
              this._enrichData(r, null, prefixInfo, scraper.name)
            );
            
            allResults.push(...enrichedResults);
          }
        }
      } catch (error) {
        console.error(`[ScraperBridge] ❌ Error buscando por prefix en ${scraper.name}:`, error.message);
      }
    }

    const uniqueResults = this._removeDuplicates(allResults, 'sku');
    const limitedResults = uniqueResults.slice(0, limit);

    const elapsed = Date.now() - startTime;
    console.log(`[ScraperBridge] ✅ Total: ${limitedResults.length} resultados únicos (${elapsed}ms)`);
    
    return limitedResults;
  }

  /**
   * BÚSQUEDA UNIVERSAL: Encuentra filtros para cualquier tipo de equipo
   * Soporta: Maquinaria, Vehículos Diesel/Gasolina, Marinos, Generadores, etc.
   * 
   * @param {Object} params - Parámetros de búsqueda
   * @param {string} params.brand - Marca del equipo (ej: "Caterpillar", "Ford", "Yamaha")
   * @param {string} params.model - Modelo del equipo (ej: "320D", "F-150", "F250")
   * @param {string} params.year - Año del equipo (opcional)
   * @param {string} params.engineModel - Modelo del motor (opcional, ej: "3126", "Cummins ISX")
   * @param {string} params.fuelType - Tipo de combustible (opcional: "diesel", "gasoline", "gas")
   * @param {string} params.category - Categoría (opcional: "heavy_machinery", "marine", etc.)
   * @param {string} params.filterType - Tipo de filtro (opcional: "oil", "fuel", "air", "hydraulic")
   * @returns {Promise<Array>} Lista de filtros compatibles
   */
  async findByEquipment(params) {
    // Normalizar parámetros
    const searchParams = this._normalizeEquipmentParams(params);
    
    if (!searchParams.brand && !searchParams.model && !searchParams.engineModel) {
      console.warn('[ScraperBridge] ⚠️ Se requiere al menos brand, model o engineModel');
      return [];
    }

    const startTime = Date.now();
    console.log('[ScraperBridge] 🔍 BÚSQUEDA UNIVERSAL DE FILTROS');
    console.log('[ScraperBridge] Parámetros:', searchParams);

    const allResults = [];

    // Buscar en todos los scrapers
    for (const scraper of this.scrapers) {
      try {
        if (typeof scraper.findByEquipment === 'function') {
          console.log(`[ScraperBridge] 🔍 Buscando en ${scraper.name}...`);
          
          const scraperResults = await this._retryOperation(
            () => scraper.findByEquipment(searchParams),
            this.config.maxRetries
          );

          if (Array.isArray(scraperResults) && scraperResults.length > 0) {
            console.log(`[ScraperBridge] ✅ Encontrados ${scraperResults.length} filtros en ${scraper.name}`);
            allResults.push(...scraperResults.map(r => this._enrichData(r, null, null, scraper.name)));
          }
        }
      } catch (error) {
        console.error(`[ScraperBridge] ❌ Error en ${scraper.name}:`, error.message);
      }
    }

    // Eliminar duplicados y ordenar por relevancia
    const uniqueResults = this._removeDuplicates(allResults, 'sku');
    const sortedResults = this._sortByRelevance(uniqueResults, searchParams);

    const elapsed = Date.now() - startTime;
    console.log(`[ScraperBridge] ✅ Total: ${sortedResults.length} filtros compatibles (${elapsed}ms)`);
    
    return sortedResults;
  }

  /**
   * Búsqueda simplificada por marca y modelo (backward compatibility)
   * @param {string} equipmentBrand - Marca del equipo
   * @param {string} equipmentModel - Modelo del equipo
   * @returns {Promise<Array>}
   */
  async findByEquipmentSimple(equipmentBrand, equipmentModel) {
    return this.findByEquipment({
      brand: equipmentBrand,
      model: equipmentModel
    });
  }

  /**
   * Búsqueda por tipo de motor
   * @param {string} engineModel - Modelo del motor (ej: "Cummins ISX", "Detroit DD15")
   * @param {string} fuelType - Tipo de combustible (opcional)
   * @returns {Promise<Array>}
   */
  async findByEngine(engineModel, fuelType = null) {
    return this.findByEquipment({
      engineModel,
      fuelType
    });
  }

  /**
   * Búsqueda por tipo de combustible
   * @param {string} fuelType - "diesel", "gasoline", "gas", "electric"
   * @param {Object} additionalParams - Parámetros adicionales
   * @returns {Promise<Array>}
   */
  async findByFuelType(fuelType, additionalParams = {}) {
    return this.findByEquipment({
      fuelType,
      ...additionalParams
    });
  }

  /**
   * Búsqueda por categoría de equipo
   * @param {string} category - Categoría (ej: "marine", "heavy_machinery")
   * @param {Object} additionalParams - Parámetros adicionales
   * @returns {Promise<Array>}
   */
  async findByCategory(category, additionalParams = {}) {
    return this.findByEquipment({
      category,
      ...additionalParams
    });
  }

  /**
   * Normaliza los parámetros de búsqueda de equipos
   * @private
   */
  _normalizeEquipmentParams(params) {
    const normalized = {};

    // Normalizar strings
    if (params.brand) normalized.brand = params.brand.trim();
    if (params.model) normalized.model = params.model.trim();
    if (params.year) normalized.year = params.year.toString().trim();
    if (params.engineModel) normalized.engineModel = params.engineModel.trim();
    if (params.filterType) normalized.filterType = params.filterType.toLowerCase().trim();
    
    // Normalizar fuel type
    if (params.fuelType) {
      const fuelType = params.fuelType.toLowerCase().trim();
      normalized.fuelType = this._normalizeFuelType(fuelType);
    }

    // Detectar categoría automáticamente si no se proporciona
    if (!params.category && params.brand) {
      normalized.category = this._detectCategory(params.brand, params.model);
    } else if (params.category) {
      normalized.category = params.category.toLowerCase().trim();
    }

    return normalized;
  }

  /**
   * Normaliza el tipo de combustible
   * @private
   */
  _normalizeFuelType(fuelType) {
    const fuelMap = {
      'diesel': 'diesel',
      'gasoil': 'diesel',
      'gasoleo': 'diesel',
      'gasoline': 'gasoline',
      'gasolina': 'gasoline',
      'petrol': 'gasoline',
      'gas': 'gas',
      'natural gas': 'gas',
      'lng': 'gas',
      'electric': 'electric',
      'hybrid': 'hybrid'
    };

    return fuelMap[fuelType] || fuelType;
  }

  /**
   * Detecta la categoría del equipo basándose en la marca/modelo
   * @private
   */
  _detectCategory(brand, model = '') {
    const brandLower = brand.toLowerCase();
    const modelLower = model.toLowerCase();
    const combined = `${brandLower} ${modelLower}`;

    // Buscar en cada categoría
    for (const [category, keywords] of Object.entries(this.equipmentCategories)) {
      for (const keyword of keywords) {
        if (combined.includes(keyword)) {
          console.log(`[ScraperBridge] 🎯 Categoría detectada: ${category}`);
          return category;
        }
      }
    }

    // Marcas específicas
    const marinebrands = ['yamaha', 'mercury', 'honda marine', 'suzuki marine', 'evinrude', 'johnson'];
    const heavyMachineryBrands = ['caterpillar', 'cat', 'komatsu', 'hitachi', 'volvo ce', 'john deere', 'case', 'jcb'];
    const automotiveBrands = ['ford', 'chevrolet', 'dodge', 'ram', 'gmc', 'toyota', 'nissan', 'honda'];

    if (marinebrands.includes(brandLower)) return 'marine';
    if (heavyMachineryBrands.includes(brandLower)) return 'heavy_machinery';
    if (automotiveBrands.includes(brandLower)) return 'diesel_vehicles';

    return 'unknown';
  }

  /**
   * Ordena resultados por relevancia
   * @private
   */
  _sortByRelevance(results, searchParams) {
    return results.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // Puntos por coincidencia exacta de marca
      if (searchParams.brand) {
        if (a.equipment_brand?.toLowerCase() === searchParams.brand.toLowerCase()) scoreA += 10;
        if (b.equipment_brand?.toLowerCase() === searchParams.brand.toLowerCase()) scoreB += 10;
      }

      // Puntos por coincidencia exacta de modelo
      if (searchParams.model) {
        if (a.equipment_model?.toLowerCase() === searchParams.model.toLowerCase()) scoreA += 10;
        if (b.equipment_model?.toLowerCase() === searchParams.model.toLowerCase()) scoreB += 10;
      }

      // Puntos por año
      if (searchParams.year) {
        if (a.equipment_year === searchParams.year) scoreA += 5;
        if (b.equipment_year === searchParams.year) scoreB += 5;
      }

      // Puntos por tipo de filtro
      if (searchParams.filterType) {
        if (a.filter_type?.toLowerCase() === searchParams.filterType) scoreA += 3;
        if (b.filter_type?.toLowerCase() === searchParams.filterType) scoreB += 3;
      }

      return scoreB - scoreA;
    });
  }

  /**
   * Enriquece los datos con información adicional
   * @private
   */
  _enrichData(data, sku = null, prefixInfo = null, source = null) {
    if (!data) return null;

    const enriched = { ...data };

    enriched.retrieved_at = new Date().toISOString();
    
    if (source) {
      enriched.data_source = source;
    }

    if (prefixInfo && typeof prefixInfo === 'object') {
      if (prefixInfo.brand) enriched.brand = prefixInfo.brand;
      if (prefixInfo.family) enriched.family = prefixInfo.family;
      if (prefixInfo.duty) enriched.duty_type = prefixInfo.duty;
    }

    if (sku && !prefixInfo) {
      const prefix = sku.split('-')[0];
      const prefixMap = require('../config/prefixMap');
      const resolvedInfo = prefixMap.resolveBrandFamilyDutyByPrefix(prefix);
      
      if (resolvedInfo) {
        enriched.brand = resolvedInfo.brand;
        enriched.family = resolvedInfo.family;
        enriched.duty_type = resolvedInfo.duty;
      }
    }

    if (enriched.sku) {
      enriched.sku = enriched.sku.trim().toUpperCase();
    }

    if (enriched.sku && !enriched.prefix) {
      enriched.prefix = enriched.sku.split('-')[0];
    }

    return enriched;
  }

  /**
   * Guarda datos en MongoDB cache
   * @private
   */
  async _cacheToMongoDB(data, sku) {
    try {
      console.log(`[ScraperBridge] 💾 Guardando en MongoDB cache: ${sku}`);
      const enrichedData = this._enrichData(data, sku);
      await mongoDBScraper.upsertFilter(enrichedData);
      console.log(`[ScraperBridge] ✅ Guardado en cache: ${sku}`);
    } catch (error) {
      console.error('[ScraperBridge] ❌ Error guardando en cache:', error.message);
    }
  }

  /**
   * Reintenta una operación
   * @private
   */
  async _retryOperation(operation, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        console.warn(`[ScraperBridge] ⚠️ Intento ${attempt}/${maxRetries} falló:`, error.message);
        
        if (attempt < maxRetries) {
          await this._sleep(this.config.retryDelay * attempt);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Elimina duplicados
   * @private
   */
  _removeDuplicates(array, key) {
    const seen = new Set();
    return array.filter(item => {
      const value = item[key];
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
  }

  /**
   * Sleep helper
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Obtiene estadísticas
   * @returns {Promise<Object>}
   */
  async getStats() {
    const stats = {
      total_scrapers: this.scrapers.length,
      cache_enabled: this.config.enableCache,
      supported_categories: Object.keys(this.equipmentCategories),
      scrapers: []
    };

    for (const scraper of this.scrapers) {
      try {
        if (typeof scraper.getStats === 'function') {
          const scraperStats = await scraper.getStats();
          stats.scrapers.push({
            name: scraper.name || 'unknown',
            ...scraperStats
          });
        }
      } catch (error) {
        console.error(`[ScraperBridge] ❌ Error obteniendo stats:`, error.message);
        stats.scrapers.push({
          name: scraper.name || 'unknown',
          error: error.message
        });
      }
    }

    return stats;
  }

  /**
   * Refresca los datos
   * @returns {Promise<Object>}
   */
  async refresh() {
    console.log('[ScraperBridge] 🔄 Iniciando refresh...');
    const startTime = Date.now();
    
    const results = {
      success: [],
      failed: [],
      timestamp: new Date().toISOString()
    };

    for (const scraper of this.scrapers) {
      try {
        if (typeof scraper.refresh === 'function') {
          console.log(`[ScraperBridge] 🔄 Refrescando ${scraper.name}...`);
          await scraper.refresh();
          results.success.push(scraper.name || 'unknown');
          console.log(`[ScraperBridge] ✅ Refresh exitoso: ${scraper.name}`);
        }
      } catch (error) {
        results.failed.push({
          scraper: scraper.name || 'unknown',
          error: error.message
        });
        console.error(`[ScraperBridge] ❌ Error en refresh:`, error.message);
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[ScraperBridge] ✅ Refresh completado (${elapsed}ms)`);
    
    results.elapsed_ms = elapsed;
    return results;
  }

  /**
   * Sincroniza Google Sheets → MongoDB
   * @returns {Promise<Object>}
   */
  async syncSheetsToMongoDB() {
    console.log('[ScraperBridge] 🔄 Iniciando sincronización Google Sheets → MongoDB...');
    const startTime = Date.now();

    try {
      const sheetsData = await googleSheetsScraper.getAllFilters();
      
      if (!Array.isArray(sheetsData) || sheetsData.length === 0) {
        console.warn('[ScraperBridge] ⚠️ No hay datos para sincronizar');
        return {
          success: false,
          message: 'No data in Google Sheets',
          synced: 0
        };
      }

      console.log(`[ScraperBridge] 📊 Sincronizando ${sheetsData.length} filtros...`);

      let synced = 0;
      let errors = 0;

      for (const filter of sheetsData) {
        try {
          await mongoDBScraper.upsertFilter(filter);
          synced++;
          
          if (synced % 100 === 0) {
            console.log(`[ScraperBridge] 📊 Progreso: ${synced}/${sheetsData.length}`);
          }
        } catch (error) {
          errors++;
          console.error(`[ScraperBridge] ❌ Error sincronizando ${filter.sku}:`, error.message);
        }
      }

      const elapsed = Date.now() - startTime;
      console.log(`[ScraperBridge] ✅ Sincronización completada: ${synced} exitosos, ${errors} errores (${elapsed}ms)`);

      return {
        success: true,
        synced,
        errors,
        total: sheetsData.length,
        elapsed_ms: elapsed
      };
    } catch (error) {
      console.error('[ScraperBridge] ❌ Error en sincronización:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Cierra conexiones
   */
  async close() {
    console.log('[ScraperBridge] 🔌 Cerrando conexiones...');
    
    for (const scraper of this.scrapers) {
      try {
        if (typeof scraper.close === 'function') {
          await scraper.close();
        }
      } catch (error) {
        console.error(`[ScraperBridge] ❌ Error cerrando:`, error.message);
      }
    }
    
    console.log('[ScraperBridge] ✅ Conexiones cerradas');
  }
}

// Exportar instancia singleton
module.exports = new ScraperBridge();
