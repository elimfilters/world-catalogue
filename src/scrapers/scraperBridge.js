// src/scrapers/scraperBridge.js
// Puente único de resolución de AUTORIDAD TÉCNICA
// No clasifica, no infiere, no crea SKU

const { scrapeDonaldson } = require("./donaldsonScraper");
const { scrapeFram } = require("./framScraper");

async function scraperBridge(normalizedCode) {
  const scrapers = [
    scrapeDonaldson,
    scrapeFram
  ];

  for (const scrape of scrapers) {
    try {
      const result = await scrape(normalizedCode);
      if (result && result.found === true) {
        return result;
      }
    } catch (_) {}
  }

  return null;
}

module.exports = {
  scraperBridge
};
