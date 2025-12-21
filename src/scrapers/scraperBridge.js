// src/scrapers/scraperBridge.js
// ============================================================================
// SCRAPER BRIDGE — AUTORIDAD TÉCNICA
// - No crea SKU
// - No infiere familia
// - No asume equivalencias
// - Solo confirma si una AUTORIDAD responde
// ============================================================================

const { scrapeDonaldson } = require('./donaldsonScraper'); // HD
const { scrapeFram } = require('./framScraper');           // LD
const { scrapeSierra } = require('./sierraScraper');       // MARINE (secundaria)

/**
 * Orden técnico de consulta:
 * 1. Donaldson (HD)
 * 2. FRAM (LD)
 * 3. SIERRA (MARINE)
 *
 * ⚠️ NO existe genericScraper
 * ⚠️ No se permiten fallbacks inventados
 */
async function scraperBridge(normalizedCode) {
  const scrapers = [
    scrapeDonaldson,
    scrapeFram,
    scrapeSierra
  ];

  for (const scrape of scrapers) {
    try {
      const result = await scrape(normalizedCode);

      if (
        result &&
        result.confirmed === true &&
        result.source &&
        result.facts &&
        typeof result.facts === 'object'
      ) {
        return {
          confirmed: true,
          source: String(result.source).toUpperCase(),
          facts: result.facts
        };
      }
    } catch (err) {
      // Fallo silencioso → intenta siguiente autoridad
      continue;
    }
  }

  // Ninguna autoridad confirmó el código
  return null;
}

module.exports = {
  scraperBridge
};
