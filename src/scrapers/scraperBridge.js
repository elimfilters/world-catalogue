// ============================================================================
// SCRAPER BRIDGE — AUTORIDAD TÉCNICA
// ============================================================================

const { scrapeDonaldson } = require('./donaldsonScraper'); // HD
const { scrapeFram } = require('./framScraper');           // LD
const { scrapeSierra } = require('./sierraScraper');       // MARINE

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
    } catch (_) {
      continue;
    }
  }

  return null;
}

module.exports = { scraperBridge };
