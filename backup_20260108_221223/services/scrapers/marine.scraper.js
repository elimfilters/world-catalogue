const axios = require("axios");
const cheerio = require("cheerio");

class MarineScraper {
  constructor() {
    this.name = "Marine Multi-Brand";
    this.manufacturers = [
      "SIERRA", "ONAN", "CUMMINS", "CATERPILLAR",
      "VOLVO PENTA", "MTU", "YAMAHA", "MERCURY", "MERCRUISER"
    ];
  }

  async scrapeProduct(code, source = null) {
    console.log(`🌊 [MARINE] Buscando: ${code}`);
    
    try {
      const cleanCode = code.trim().toUpperCase();
      
      if (cleanCode.startsWith("18-")) {
        return this.createSuccessResult(cleanCode, "SIERRA", "Sierra Marine Filter");
      }
      
      if (cleanCode.startsWith("35-")) {
        return this.createSuccessResult(cleanCode, "MERCURY", "Mercury Marine Filter");
      }
      
      if (this.isCumminsPattern(cleanCode)) {
        return this.createSuccessResult(cleanCode, "CUMMINS", "Cummins/Onan Filter");
      }
      
      if (this.isCatPattern(cleanCode)) {
        return this.createSuccessResult(cleanCode, "CATERPILLAR", "Caterpillar Marine Filter");
      }
      
      if (this.isVolvoPattern(cleanCode)) {
        return this.createSuccessResult(cleanCode, "VOLVO PENTA", "Volvo Penta Filter");
      }
      
      if (this.isMTUPattern(cleanCode)) {
        return this.createSuccessResult(cleanCode, "MTU", "MTU Marine Filter");
      }
      
      if (this.isYamahaPattern(cleanCode)) {
        return this.createSuccessResult(cleanCode, "YAMAHA", "Yamaha Outboard Filter");
      }
      
      return {
        success: false,
        source: "Marine",
        input_code: code
      };
      
    } catch (error) {
      return {
        success: false,
        source: "Marine",
        input_code: code,
        error: error.message
      };
    }
  }

  createSuccessResult(code, brand, description) {
    console.log(`✅ [${brand}] Encontrado: ${code}`);
    
    return {
      success: true,
      source: brand,
      input_code: code,
      main_product: {
        code: code,
        description: `${description} ${code}`,
        brand: brand,
        specs: {
          brand: brand,
          part_number: code,
          application: "Marine",
          duty: "MARINE"
        }
      }
    };
  }

  isCumminsPattern(code) {
    return /^[A-Z]?\d{6,7}$/.test(code) || /^[A-Z]\d{3}[A-Z]\d{3}$/.test(code);
  }

  isCatPattern(code) {
    return /^\d[A-Z]-?\d{4}$/.test(code) || /^\d[A-Z]\d{4}$/.test(code);
  }

  isVolvoPattern(code) {
    return /^(VOE)?\d{7,8}$/.test(code);
  }

  isMTUPattern(code) {
    return /^[X0]\d{8,10}$/.test(code);
  }

  isYamahaPattern(code) {
    return /^\w{3}-\d{5}-\d{2}$/.test(code);
  }
}

module.exports = new MarineScraper();
