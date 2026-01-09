const axios = require("axios");
const cheerio = require("cheerio");
const donaldsonMapper = require("../mappers/donaldson.mapper");
const skuGenerator = require("../sku.generator");

/**
 * DONALDSON SCRAPER ENHANCED - VERSION SIMPLIFICADA
 * Sin dependencia de puppeteer
 */
async function scrapeDonaldsonEnhanced(donaldsonSKU) {
  try {
    const url = `https://www.donaldson.com/en-us/industrial-dust-fume-mist/search/?q=${donaldsonSKU}`;
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const specs = {};

    // Extraer especificaciones de la tabla
    $("table.specifications tr").each((i, row) => {
      const label = $(row).find("td").first().text().trim();
      const value = $(row).find("td").last().text().trim();
      if (label && value) {
        specs[label] = value;
      }
    });

    // Alternativas básicas (sin puppeteer por ahora)
    const alternatives = {
      baldwin: null,
      wix: null,
      fram: null,
      fleetguard: null,
      mann: null
    };

    // Mapear specs a columnas del sheet
    const mappedData = donaldsonMapper.mapToSheet(specs, donaldsonSKU, alternatives);

    // Generar SKU ELIMFILTERS
    const elimfiltersData = await skuGenerator.generate({
      competitorSKU: donaldsonSKU,
      type: mappedData.elimfiltersType || "OIL",
      duty: "HEAVY"
    });

    // Combinar todo
    const result = {
      ...mappedData,
      ...elimfiltersData,
      source: "DONALDSON_ENHANCED_SIMPLE",
      scrapedAt: new Date().toISOString()
    };

    return result;

  } catch (error) {
    console.error("Error scraping Donaldson:", error.message);
    throw error;
  }
}

module.exports = scrapeDonaldsonEnhanced;
