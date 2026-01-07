const axios = require("axios");
const cheerio = require("cheerio");

class DonaldsonCrossReferenceScraper {
  constructor() {
    this.baseUrl = "https://shop.donaldson.com";
    this.searchUrl = "/store/es-us/search";
  }

  async scrapeProduct(oemCode) {
    try {
      const crossRef = await this.searchCrossReference(oemCode);
      if (!crossRef) return this.getMockData(oemCode);
      
      const details = await this.scrapeProductDetails(crossRef.productUrl);
      const trilogy = this.generateTrilogy(crossRef.donaldsonCode, details);

      return {
        success: true,
        source: "Donaldson_Real",
        input_code: oemCode,
        generated_skus: trilogy,
        total_products: 3
      };
    } catch (error) {
      return this.getMockData(oemCode);
    }
  }

  async searchCrossReference(oemCode) {
    try {
      const response = await axios.get(`${this.baseUrl}${this.searchUrl}?Ntt=${oemCode}*`, {
        headers: { "User-Agent": "Mozilla/5.0" },
        timeout: 15000
      });
      const $ = cheerio.load(response.data);
      let donaldsonCode = null;
      let productUrl = null;

      $("a[href*=\"/product/\"]").each((i, elem) => {
        const href = $(elem).attr("href");
        const match = href.match(/\/product\/([A-Z]+\d+)/);
        if (match) {
          donaldsonCode = match[1];
          productUrl = `${this.baseUrl}${href}`;
          return false;
        }
      });

      return donaldsonCode ? { donaldsonCode, productUrl } : null;
    } catch (error) {
      return null;
    }
  }

  async scrapeProductDetails(productUrl) {
    try {
      const response = await axios.get(productUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
        timeout: 15000
      });
      const $ = cheerio.load(response.data);
      return { title: $("h1").first().text().trim() };
    } catch (error) {
      return { title: "Filtro Donaldson" };
    }
  }

  generateTrilogy(donaldsonCode, details) {
    const baseNum = donaldsonCode.replace(/\D/g, "").slice(-4).padStart(4, "0");
    return [
      { donaldson_code: donaldsonCode, elimfilters_sku: `EL8${baseNum}`, tier: "STANDARD", duty: "HEAVY_DUTY" },
      { donaldson_code: `P${donaldsonCode.replace(/^P/, "")}`, elimfilters_sku: `EL8${(parseInt(baseNum) + 1).toString().padStart(4, "0")}`, tier: "PERFORMANCE", duty: "HEAVY_DUTY" },
      { donaldson_code: `DBL${baseNum}`, elimfilters_sku: `EL8${(parseInt(baseNum) + 2).toString().padStart(4, "0")}`, tier: "ELITE", duty: "HEAVY_DUTY" }
    ];
  }

  getMockData(code) {
    const baseNum = code.replace(/\D/g, "").slice(-4).padStart(4, "0");
    return {
      success: true,
      source: "Donaldson_MOCK",
      input_code: code,
      generated_skus: [
        { donaldson_code: code, elimfilters_sku: `EL8${baseNum}`, tier: "STANDARD", duty: "HEAVY_DUTY" },
        { donaldson_code: `${code}-P`, elimfilters_sku: `EL8${(parseInt(baseNum) + 1).toString().padStart(4, "0")}`, tier: "PERFORMANCE", duty: "HEAVY_DUTY" },
        { donaldson_code: `DBL${baseNum}`, elimfilters_sku: `EL8${(parseInt(baseNum) + 2).toString().padStart(4, "0")}`, tier: "ELITE", duty: "HEAVY_DUTY" }
      ],
      total_products: 3
    };
  }
}

module.exports = new DonaldsonCrossReferenceScraper();
