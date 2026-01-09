const { generateSKU } = require("../config/elimfilters.rules");

class ClassificationService {
  classifyFilter(scrapedData) {
    const code = scrapedData.code || "";
    const desc = (scrapedData.description || "").toLowerCase();
    const manufacturer = (scrapedData.source || "").toLowerCase();
    
    let prefix = "EL8";
    if (desc.includes("air") || desc.includes("aire")) prefix = "EA1";
    if (desc.includes("fuel") || desc.includes("combustible")) prefix = "EF9";
    
    return {
      input_code: code,
      elimfilters_sku: generateSKU(prefix, code),
      duty: "HEAVY_DUTY",
      category: prefix,
      manufacturer: scrapedData.source
    };
  }
}

module.exports = new ClassificationService();
