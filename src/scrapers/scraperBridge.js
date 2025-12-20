// src/scrapers/scraperBridge.js
const googleSheetsScraper = require('./googleSheetsScraper');
const mongoDBScraper = require('./mongoDBScraper');

/**
 * ScraperBridge - Puente unificado para todos los scrapers
 * Coordina la búsqueda de datos entre MongoDB, Google Sheets y otros scrapers
 * 
 * ESTRATEGIA HÍBRIDA:
 * 1. Buscar primero en MongoDB (cache rápido)
 * 2. Si no encuentra, buscar en Google Sheets
 * 3. Si encuentra en Sheets, guardar en MongoDB para futuras búsquedas
 */
class ScraperBridge {
  constructor() {
    // Orden de prioridad: MongoDB primero (más rápido), luego Google Sheets
    this.scrapers = [
      mongoDBScraper,
      googleSheetsScraper
    ];
    
    // Configuración
    this.config = {
      enableCache: process.env.ENABLE_MONGODB_CACHE !== 'false', // true por defecto
      cacheToMongoDB: process.env.CACHE_TO_MONGODB !== 'false',  // true por defecto
      maxRetries: 3,
      retryDelay: 1000 // ms
    };

    console.log('[ScraperBridge] Inicializado con', this.scrapers.length, 'scrapers');
    console.log('[ScraperBridge] Cache MongoDB:', this.config.enableCache ? '✅ Habilitado' : '❌ Deshabilitado');
  }

  /**
   * Busca datos de un filtro por SKU
   * @param {string} sku - SKU del filtro (ej: "PALL-HC8314")
   * @param {Object} options - Opciones de búsqueda
   * @returns {Promise<Object|null>} Datos del filtro o null
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

    // ESTRATEGIA 1: Buscar en MongoDB primero (si está habilitado)
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
        // Continuar con otros scrapers si MongoDB falla
      }
    }

    // ESTRATEGIA 2: Buscar en otros scrapers (Google Sheets, etc.)
    for (const scraper of this.scrapers) {
      // Saltar MongoDB si ya lo intentamos
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
          
          // ESTRATEGIA 3: Guardar en MongoDB para futuras búsquedas
          if (this.config.cacheToMongoDB && scraper !== mongoDBScraper) {
            this._cacheToMongoDB(result, normalizedSKU).catch(err => {
              console.error('[ScraperBridge] ⚠️ Error guardando en cache:', err.message);
            });
          }
          
          break;
        }
      } catch (error) {
        console.error(`[ScraperBridge] ❌ Error en ${scraper.name || 'scraper'}:`, error.message);
        // Continuar con el siguiente scraper
      }
    }

    if (!result) {
      const elapsed = Date.now() - startTime;
      console.log(`[ScraperBridge] ❌ SKU no encontrado en ninguna fuente: ${normalizedSKU} (${elapsed}ms)`);
      return null;
    }

    return this._enrichData(result, normalizedSKU, foundInScraper);
  }

  /**
   * Busca datos por prefix del SKU
   * @param {string} prefix - Prefijo del SKU (ej: "PALL", "DONL")
   * @param {Object} options - Opciones de búsqueda
   * @returns {Promise<Array>} Lista de filtros con ese prefijo
   */
  async findByPrefix(prefix, options = {}) {
    if (!prefix || typeof prefix !== 'string') {
      console.warn('[ScraperBridge] Prefix inválido:', prefix);
      return [];
    }

    const normalizedPrefix = prefix.trim().toUpperCase();
    const startTime = Date.now();
    console.log(`[ScraperBridge] 🔍 Buscando por prefix: ${normalizedPrefix}`);

    // Resolver información del prefix usando prefixMap
    const prefixMap = require('../config/prefixMap');
    const prefixInfo = prefixMap.resolveBrandFamilyDutyByPrefix(normalizedPrefix);
    
    if (!prefixInfo) {
      console.warn(`[ScraperBridge] ⚠️ Prefix no reconocido: ${normalizedPrefix}`);
    } else {
      console.log(`[ScraperBridge] ℹ️ Prefix info:`, prefixInfo);
    }

    const allResults = [];
    const limit = options.limit || 100;

    // Buscar en todos los scrapers
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
            
            // Enriquecer y agregar resultados
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

    // Eliminar duplicados por SKU
    const uniqueResults = this._removeDuplicates(allResults, 'sku');
    
    // Aplicar límite
    const limitedResults = uniqueResults.slice(0, limit);

    const elapsed = Date.now() - startTime;
    console.log(`[ScraperBridge] ✅ Total: ${limitedResults.length} resultados únicos para prefix ${normalizedPrefix} (${elapsed}ms)`);
    
    return limitedResults;
  }

  /**
   * Busca filtros por equipo
   * @param {string} equipmentBrand - Marca del equipo
   * @param {string} equipmentModel - Modelo del equipo
   * @returns {Promise<Array>} Lista de filtros compatibles
   */
  async findByEquipment(equipmentBrand, equipmentModel) {
    if (!equipmentBrand || !equipmentModel) {
      console.warn('[ScraperBridge] Parámetros de equipo inválidos');
      return [];
    }

    const startTime = Date.now();
    console.log(`[ScraperBridge] 🔍 Buscando filtros para: ${equipmentBrand} ${equipmentModel}`);

    const allResults = [];

    // Buscar en scrapers que soporten búsqueda por equipo
    for (const scraper of this.scrapers) {
      try {
        if (typeof scraper.findByEquipment === 'function') {
          console.log(`[ScraperBridge] 🔍 Buscando en ${scraper.name}...`);
          
          const scraperResults = await this._retryOperation(
            () => scraper.findByEquipment(equipmentBrand, equipmentModel),
            this.config.maxRetries
          );

          if (Array.isArray(scraperResults) && scraperResults.length > 0) {
            console.log(`[ScraperBridge] ✅ Encontrados ${scraperResults.length} filtros en ${scraper.name}`);
            allResults.push(...scraperResults.map(r => this._enrichData(r, null, null, scraper.name)));
          }
        }
      } catch (error) {
        console.error(`[ScraperBridge] ❌ Error buscando por equipo en ${scraper.name}:`, error.message);
      }
    }

    // Eliminar duplicados
    const uniqueResults = this._removeDuplicates(allResults, 'sku');

    const elapsed = Date.now() - startTime;
    console.log(`[ScraperBridge] ✅ Total: ${uniqueResults.length} filtros compatibles (${elapsed}ms)`);
    
    return uniqueResults;
  }

  /**
   * Enriquece los datos con información adicional
   * @private
   */
  _enrichData(data, sku = null, prefixInfo = null, source = null) {
    if (!data) return null;

    const enriched = { ...data };

    // Agregar metadata
    enriched.retrieved_at = new Date().toISOString();
    
    if (source) {
      enriched.data_source = source;
    }

    // Agregar información del prefix si está disponible
    if (prefixInfo && typeof prefixInfo === 'object') {
      if (prefixInfo.brand) enriched.brand = prefixInfo.brand;
      if (prefixInfo.family) enriched.family = prefixInfo.family;
      if (prefixInfo.duty) enriched.duty_type = prefixInfo.duty;
    }

    // Si tenemos SKU, extraer prefix y enriquecer
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

    // Normalizar campos comunes
    if (enriched.sku) {
      enriched.sku = enriched.sku.trim().toUpperCase();
    }

    // Extraer prefix del SKU si no existe
    if (enriched.sku && !enriched.prefix) {
      enriched.prefix = enriched.sku.split('-')[0];
    }

    return enriched;
  }

  /**
   * Guarda datos en MongoDB cache (async, no bloquea)
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
      // No lanzar error, solo registrar
    }
  }

  /**
   * Reintenta una operación en caso de fallo
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
   * Elimina duplicados de un array basado en una clave
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
   * Obtiene estadísticas de todos los scrapers
   * @returns {Promise<Object>} Estadísticas consolidadas
   */
  async getStats() {
    const stats = {
      total_scrapers: this.scrapers.length,
      cache_enabled: this.config.enableCache,
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
        console.error(`[ScraperBridge] ❌ Error obteniendo stats de ${scraper.name}:`, error.message);
        stats.scrapers.push({
          name: scraper.name || 'unknown',
          error: error.message
        });
      }
    }

    return stats;
  }

  /**
   * Refresca los datos de todos los scrapers
   * @returns {Promise<Object>} Resultado del refresh
   */
  async refresh() {
    console.log('[ScraperBridge] 🔄 Iniciando refresh de todos los scrapers...');
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
        console.error(`[ScraperBridge] ❌ Error en refresh de ${scraper.name}:`, error.message);
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[ScraperBridge] ✅ Refresh completado: ${results.success.length} exitosos, ${results.failed.length} fallidos (${elapsed}ms)`);
    
    results.elapsed_ms = elapsed;
    return results;
  }

  /**
   * Sincroniza Google Sheets → MongoDB
   * @returns {Promise<Object>} Resultado de la sincronización
   */
  async syncSheetsToMongoDB() {
    console.log('[ScraperBridge] 🔄 Iniciando sincronización Google Sheets → MongoDB...');
    const startTime = Date.now();

    try {
      // Obtener todos los datos de Google Sheets
      const sheetsData = await googleSheetsScraper.getAllFilters();
      
      if (!Array.isArray(sheetsData) || sheetsData.length === 0) {
        console.warn('[ScraperBridge] ⚠️ No hay datos en Google Sheets para sincronizar');
        return {
          success: false,
          message: 'No data in Google Sheets',
          synced: 0
        };
      }

      console.log(`[ScraperBridge] 📊 Sincronizando ${sheetsData.length} filtros...`);

      let synced = 0;
      let errors = 0;

      // Insertar/actualizar cada filtro en MongoDB
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
   * Cierra todas las conexiones
   */
  async close() {
    console.log('[ScraperBridge] 🔌 Cerrando conexiones...');
    
    for (const scraper of this.scrapers) {
      try {
        if (typeof scraper.close === 'function') {
          await scraper.close();
        }
      } catch (error) {
        console.error(`[ScraperBridge] ❌ Error cerrando ${scraper.name}:`, error.message);
      }
    }
    
    console.log('[ScraperBridge] ✅ Todas las conexiones cerradas');
  }
}

// Exportar instancia singleton
module.exports = new ScraperBridge();
