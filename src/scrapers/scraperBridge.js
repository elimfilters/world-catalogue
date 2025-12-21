// src/scrapers/scraperBridge.js
// Puente único de resolución de AUTORIDAD TÉCNICA
// No clasifica, no infiere, no crea SKU

const { scrapeDonaldson } = require("./donaldsonScraper");
const { scrapeFram } = require("./framScraper");
const { scrapeGeneric } = require("./genericScraper");

async function scraperBridge(normalizedCode) {
  // Orden de intento NO implica prioridad comercial
  // Solo es orden técnico de consulta
  const scrapers = [
    scrapeDonaldson,
    scrapeFram,
    scrapeGeneric
  ];

  for (const scrape of scrapers) {
    try {
      const result = await scrape(normalizedCode);

      if (
        result &&
        result.confirmed === true &&
        result.source &&
        result.facts &&
        typeof result.facts === "object"
      ) {
        return {
          confirmed: true,
          source: String(result.source).toUpperCase(),
          facts: result.facts
        };
      }
    } catch (e) {
      // Fallos de scraper NO rompen el flujo
      // Simplemente se intenta el siguiente
      continue;
    }
  }

  // Ninguna autoridad confirmó el código
  return null;
}

module.exports = {
  scraperBridge
};
