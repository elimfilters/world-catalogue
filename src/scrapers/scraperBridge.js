// ═══════════════════════════════════════════════════════════════════════════
// ELIMFILTERS - SCRAPER BRIDGE
// Puente unificado para todos los scrapers
// ═══════════════════════════════════════════════════════════════════════════

import prefixMap from '../config/prefixMap.js';

// ─────────────────────────────────────────────────────────────────────────
// IMPORTAR SCRAPERS
// ─────────────────────────────────────────────────────────────────────────

import fleetguardScraper from './fleetguardScraper.js';
import donaldsonScraper from './donaldsonScraper.js';
import baldwinScraper from './baldwinScraper.js';
import wixScraper from './wixScraper.js';
import framScraper from './framScraper.js';
import mannScraper from './mannScraper.js';
import purolatorScraper from './purolatorScraper.js';
import boschScraper from './boschScraper.js';
import mahleScraper from './mahleScraper.js';
import sakuraScraper from './sakuraScraper.js';
import hengstScraper from './hengstScraper.js';

// ═══════════════════════════════════════════════════════════════════════════
// MAPA DE SCRAPERS POR MARCA
// ═══════════════════════════════════════════════════════════════════════════

const SCRAPERS = {
  'Fleetguard': fleetguardScraper,
  'Donaldson': donaldsonScraper,
  'Baldwin': baldwinScraper,
  'WIX': wixScraper,
  'FRAM': framScraper,
  'MANN': mannScraper,
  'Purolator': purolatorScraper,
  'Bosch': boschScraper,
  'MAHLE': mahleScraper,
  'Sakura': sakuraScraper,
  'Hengst': hengstScraper,
};

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL: scrapePartNumber
// ═══════════════════════════════════════════════════════════════════════════

export async function scrapePartNumber(partNumber) {
  console.log(`[SCRAPER BRIDGE] Iniciando scraping para: ${partNumber}`);

  // ─────────────────────────────────────────────────────────────────────────
  // PASO 1: Extraer prefijo
  // ─────────────────────────────────────────────────────────────────────────

  const prefix = prefixMap.extractPrefix(partNumber);

  if (!prefix) {
    console.warn(`[SCRAPER BRIDGE] ⚠️ No se pudo extraer prefijo de: ${partNumber}`);
    return {
      success: false,
      error: 'UNKNOWN_PREFIX',
      message: `No se reconoce el prefijo del part number: ${partNumber}`
    };
  }

  console.log(`[SCRAPER BRIDGE] ✅ Prefijo detectado: ${prefix}`);

  // ─────────────────────────────────────────────────────────────────────────
  // PASO 2: Resolver Brand, Family, Duty
  // ─────────────────────────────────────────────────────────────────────────

  const resolved = prefixMap.resolveBrandFamilyDutyByPrefix(prefix);

  if (!resolved) {
    console.warn(`[SCRAPER BRIDGE] ⚠️ Prefijo no mapeado: ${prefix}`);
    return {
      success: false,
      error: 'UNMAPPED_PREFIX',
      message: `El prefijo "${prefix}" no está mapeado en prefixMap.js`
    };
  }

  const { brand, family, duty } = resolved;

  console.log(`[SCRAPER BRIDGE] ✅ Resuelto → Brand: ${brand}, Family: ${family}, Duty: ${duty}`);

  // ─────────────────────────────────────────────────────────────────────────
  // PASO 3: Seleccionar scraper
  // ─────────────────────────────────────────────────────────────────────────

  const scraper = SCRAPERS[brand];

  if (!scraper) {
    console.warn(`[SCRAPER BRIDGE] ⚠️ No hay scraper disponible para: ${brand}`);
    return {
      success: false,
      error: 'NO_SCRAPER',
      message: `No hay scraper implementado para la marca: ${brand}`
    };
  }

  console.log(`[SCRAPER BRIDGE] ✅ Scraper seleccionado: ${brand}`);

  // ─────────────────────────────────────────────────────────────────────────
  // PASO 4: Ejecutar scraper
  // ─────────────────────────────────────────────────────────────────────────

  try {
    const result = await scraper.scrape(partNumber);

    if (!result || !result.success) {
      console.warn(`[SCRAPER BRIDGE] ⚠️ Scraper falló para: ${partNumber}`);
      return {
        success: false,
        error: 'SCRAPER_FAILED',
        message: result?.message || 'El scraper no pudo obtener datos',
        brand,
        family,
        duty
      };
    }

    console.log(`[SCRAPER BRIDGE] ✅ Scraping exitoso para: ${partNumber}`);

    // ─────────────────────────────────────────────────────────────────────
    // PASO 5: Enriquecer resultado con Brand, Family, Duty
    // ─────────────────────────────────────────────────────────────────────

    return {
      success: true,
      brand,
      family,
      duty,
      data: result.data,
      source: brand,
      scraped_at: new Date().toISOString()
    };

  } catch (error) {
    console.error(`[SCRAPER BRIDGE] ❌ Error ejecutando scraper para ${partNumber}:`, error.message);
    return {
      success: false,
      error: 'SCRAPER_ERROR',
      message: `Error interno del scraper: ${error.message}`,
      brand,
      family,
      duty
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIÓN: getSupportedBrands
// Retorna lista de marcas soportadas
// ═══════════════════════════════════════════════════════════════════════════

export function getSupportedBrands() {
  return Object.keys(SCRAPERS);
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTACIÓN POR DEFECTO
// ═══════════════════════════════════════════════════════════════════════════

export default {
  scrapePartNumber,
  getSupportedBrands
};
