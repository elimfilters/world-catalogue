/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MASTER SCRAPER - Orquestador de Todos los Scrapers
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Detecta automáticamente el fabricante y ejecuta el scraper apropiado:
 * 
 * - Donaldson (Heavy Duty) → P, R, X, DBL codes
 * - FRAM (Light Duty) → PH, CA, CF, XG codes
 * - Racor → ET9 (Turbinas FH + 2020) | EF9 (Resto)
 * - Marine → EM9 (Sierra + Mercury)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

const donaldsonScraper = require("./donaldson.scraper");
const framScraper = require("./fram.scraper");
const racorScraper = require("./racor.scraper");
const marineScraper = require("./marine.scraper");

class MasterScraper {
  constructor() {
    this.scrapers = {
      donaldson: donaldsonScraper,
      fram: framScraper,
      racor: racorScraper,
      marine: marineScraper
    };
  }

  /**
   * Detecta automáticamente el fabricante y scrapea el producto
   * @param {string} code - Código de filtro a buscar
   * @returns {Object} Resultados completos del scraping
   */
  async scrape(code) {
    try {
      console.log(`\n🎯 MASTER SCRAPER: Analizando código ${code}...`);
      
      // 1. DETECTAR FABRICANTE
      const manufacturer = this.detectManufacturer(code);
      console.log(`📍 Fabricante detectado: ${manufacturer.name}`);
      
      // 2. EJECUTAR SCRAPER APROPIADO
      let result;
      
      switch (manufacturer.type) {
        case "donaldson":
          result = await this.scrapers.donaldson.scrapeProduct(code);
          break;
          
        case "fram":
          result = await this.scrapers.fram.scrapeProduct(code, manufacturer.filterType);
          break;
          
        case "racor":
          result = await this.scrapers.racor.scrapeProduct(code);
          break;
          
        case "marine":
          result = await this.scrapers.marine.scrapeProduct(code, manufacturer.source);
          break;
          
        default:
          // FALLBACK: Intentar todos los scrapers
          result = await this.tryAllScrapers(code);
      }
      
      // 3. ENRIQUECER RESULTADO
      return {
        ...result,
        detected_manufacturer: manufacturer,
        timestamp: new Date().toISOString(),
        master_scraper_version: "1.0.0"
      };
      
    } catch (error) {
      console.error(`❌ Error en Master Scraper:`, error.message);
      return {
        success: false,
        input_code: code,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Detecta el fabricante basado en patrones de código
   */
  detectManufacturer(code) {
    const codeUpper = code.toUpperCase();
    
    // ═══════════════════════════════════════════════════════════════════════
    // DONALDSON (Heavy Duty)
    // ═══════════════════════════════════════════════════════════════════════
    if (this.isDonaldsonCode(codeUpper)) {
      return {
        type: "donaldson",
        name: "Donaldson",
        duty: "Heavy Duty",
        confidence: "high",
        pattern: this.getDonaldsonPattern(codeUpper)
      };
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // FRAM (Light Duty)
    // ═══════════════════════════════════════════════════════════════════════
    if (this.isFramCode(codeUpper)) {
      return {
        type: "fram",
        name: "FRAM",
        duty: "Light Duty",
        confidence: "high",
        filterType: this.getFramFilterType(codeUpper),
        pattern: this.getFramPattern(codeUpper)
      };
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // RACOR (ET9 o EF9)
    // ═══════════════════════════════════════════════════════════════════════
    if (this.isRacorCode(codeUpper)) {
      const isET9 = this.isRacorET9(codeUpper);
      return {
        type: "racor",
        name: "Racor Parker",
        duty: "Specialized",
        category: isET9 ? "ET9" : "EF9",
        technology: isET9 ? "AQUAGUARD™" : "SYNTEPORE™",
        confidence: "high",
        pattern: this.getRacorPattern(codeUpper)
      };
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // MARINE (EM9)
    // ═══════════════════════════════════════════════════════════════════════
    if (this.isMarineCode(codeUpper)) {
      return {
        type: "marine",
        name: this.getMarineBrand(codeUpper),
        duty: "Marine",
        category: "EM9",
        technology: "MARINEGUARD™",
        confidence: "high",
        source: this.getMarineSource(codeUpper),
        pattern: this.getMarinePattern(codeUpper)
      };
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // DESCONOCIDO
    // ═══════════════════════════════════════════════════════════════════════
    return {
      type: "unknown",
      name: "Desconocido",
      confidence: "low",
      note: "Se intentarán todos los scrapers"
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DETECCIÓN DONALDSON
  // ═══════════════════════════════════════════════════════════════════════════
  
    isDonaldsonCode(code) {
    // Códigos nativos Donaldson
    const nativePatterns = [
      /^P\d{6}$/,           // P551808
      /^R\d{6}$/,           // R12345
      /^X\d{6}$/,           // X12345
      /^\d{1,2}R\d{4}$/,    // 1R1808
      /^DBL\d{4,6}$/,       // DBL7621
      /^B\d{5}$/,           // B12345
      /^C\d{6}$/,           // C12345
      /^H\d{6}$/,           // H12345
      /^ECC\d{5}$/,         // ECC12345
      /^FPG\d{5}$/          // FPG12345
    ];

    // Códigos cross-reference (Fleetguard, Cummins, Baldwin, etc.)
    const crossRefPatterns = [
      /^LF\d{4,5}$/,        // LF3620 (Fleetguard Oil)
      /^FF\d{4,5}$/,        // FF5052 (Fleetguard Fuel)
      /^FS\d{4,5}$/,        // FS1234 (Fleetguard Fuel/Water Sep)
      /^AF\d{4,5}$/,        // AF25667 (Fleetguard Air)
      /^HF\d{4,5}$/,        // HF6177 (Fleetguard Hydraulic)
      /^WF\d{4,5}$/,        // WF2054 (Fleetguard Water)
      /^\d{5,6}$/,          // 51806 (Cummins OEM)
      /^BT\d{3,4}$/,        // BT339 (Baldwin)
      /^B\d{3,4}$/,         // B160 (Baldwin)
      /^PA\d{4,5}$/,        // PA2837 (Baldwin Air)
      /^PT\d{4}$/           // PT9441 (Baldwin)
    ];

    const allPatterns = [...nativePatterns, ...crossRefPatterns];
    return allPatterns.some(pattern => pattern.test(code));
  }

  getDonaldsonPattern(code) {
    if (code.startsWith("P")) return "P-Series (Lube/Oil)";
    if (code.startsWith("R")) return "R-Series (Air)";
    if (code.startsWith("X")) return "X-Series (Fuel)";
    if (code.includes("R") && /^\d/.test(code)) return "Industrial (1R/2R)";
    if (code.startsWith("DBL")) return "DBL Blue (Ultra-Web)";
    if (code.startsWith("B")) return "B-Series (Air)";
    if (code.startsWith("C")) return "C-Series (Coolant)";
    if (code.startsWith("H")) return "H-Series (Hydraulic)";
    return "Donaldson Standard";
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DETECCIÓN FRAM
  // ═══════════════════════════════════════════════════════════════════════════
  
  isFramCode(code) {
    const patterns = [
      /^PH\d{3,5}$/,        // PH3600
      /^XG\d{3,5}$/,        // XG3600 (Tough Guard)
      /^CA\d{3,5}$/,        // CA12345 (Cabin/Air)
      /^CF\d{3,5}$/,        // CF12345 (Cabin Fresh Breeze)
      /^PS\d{3,5}$/,        // PS12345 (Fuel)
      /^CS\d{3,5}$/,        // CS12345 (Fuel)
      /^G\d{4}$/,           // G1234 (Fuel)
      /^HPG\d+$/,           // HPG series
      /^PRO\d+$/            // PRO series
    ];
    
    return patterns.some(pattern => pattern.test(code));
  }

  getFramFilterType(code) {
    if (code.startsWith("PH") || code.startsWith("XG")) return "oil-filters";
    if (code.startsWith("CA") || code.startsWith("CF")) return "cabin-filters";
    if (code.startsWith("PS") || code.startsWith("CS") || code.startsWith("G")) return "fuel-filters";
    return "oil-filters"; // Default
  }

  getFramPattern(code) {
    if (code.startsWith("PH")) return "Extra Guard (Oil)";
    if (code.startsWith("XG")) return "Tough Guard (Oil)";
    if (code.startsWith("CA")) return "Air Filter";
    if (code.startsWith("CF")) return "Cabin Filter";
    if (code.startsWith("PS") || code.startsWith("CS")) return "Fuel Filter";
    return "FRAM Standard";
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DETECCIÓN RACOR
  // ═══════════════════════════════════════════════════════════════════════════
  
  isRacorCode(code) {
    const patterns = [
      /^1000FH$/,           // Turbina 1000FH (ET9)
      /^900FH$/,            // Turbina 900FH (ET9)
      /^500FH$/,            // Turbina 500FH (ET9)
      /^2020[A-Z]{2}$/,     // 2020PM, 2020TM, 2020SM (ET9)
      /^2020$/,             // 2020 base (ET9)
      /^R\d{2,3}[A-Z]*$/,   // R90P, R120P (EF9)
      /^\d{3,4}[A-Z]{1,3}$/ // 500FG, 120AS (EF9)
    ];
    
    return patterns.some(pattern => pattern.test(code));
  }

  isRacorET9(code) {
    // SOLO Turbinas FH y Cartuchos 2020
    const ET9_CODES = ["1000FH", "900FH", "500FH"];
    return ET9_CODES.includes(code) || code.startsWith("2020");
  }

  getRacorPattern(code) {
    if (code.includes("FH")) return "Turbina FH (ET9/AQUAGUARD™)";
    if (code.startsWith("2020")) return "Cartucho 2020 (ET9/AQUAGUARD™)";
    if (code.startsWith("R")) return "R-Series Separator (EF9/SYNTEPORE™)";
    return "Separador Estándar (EF9/SYNTEPORE™)";
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DETECCIÓN MARINE
  // ═══════════════════════════════════════════════════════════════════════════
  
  isMarineCode(code) {
    const patterns = [
      /^\d{2}-\d{4,7}$/,    // 18-7944 (Sierra)
      /^35-\d{7,10}$/,      // 35-8M0061975 (Mercury)
      /^\d{8}M\d{7}$/,      // Mercury format
      /^8M\d{7}$/           // Mercury short format
    ];
    
    return patterns.some(pattern => pattern.test(code));
  }

  getMarineBrand(code) {
    if (code.includes("8M") || code.startsWith("35-8M")) return "Mercury Marine";
    if (/^\d{2}-\d{4}$/.test(code)) return "Sierra";
    return "Marine Universal";
  }

  getMarineSource(code) {
    if (code.includes("8M") || code.startsWith("35-8M")) return "mercury";
    return "sierra";
  }

  getMarinePattern(code) {
    if (code.includes("8M")) return "Mercury OEM (EM9/MARINEGUARD™)";
    if (/^\d{2}-\d{4}$/.test(code)) return "Sierra (EM9/MARINEGUARD™)";
    return "Marine Standard (EM9/MARINEGUARD™)";
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FALLBACK: INTENTAR TODOS LOS SCRAPERS
  // ═══════════════════════════════════════════════════════════════════════════
  
  async tryAllScrapers(code) {
    console.log(`⚠️  Fabricante desconocido. Intentando todos los scrapers...`);
    
    const results = [];
    
    // Intentar cada scraper
    for (const [name, scraper] of Object.entries(this.scrapers)) {
      try {
        console.log(`🔍 Intentando scraper: ${name}...`);
        const result = await scraper.scrapeProduct(code);
        
        if (result.success) {
          results.push({
            scraper: name,
            ...result
          });
        }
      } catch (error) {
        console.log(`❌ Scraper ${name} falló: ${error.message}`);
      }
    }
    
    // Retornar el primer resultado exitoso
    if (results.length > 0) {
      console.log(`✅ Encontrado en: ${results[0].scraper}`);
      return results[0];
    }
    
    return {
      success: false,
      input_code: code,
      error: "Código no encontrado en ningún fabricante",
      attempted_scrapers: ["donaldson", "fram", "racor", "marine"]
    };
  }

  /**
   * Búsqueda múltiple en paralelo
   */
  async scrapeMultiple(codes) {
    console.log(`\n🚀 Scrapeando ${codes.length} códigos en paralelo...`);
    
    const promises = codes.map(code => this.scrape(code));
    const results = await Promise.allSettled(promises);
    
    return results.map((result, index) => ({
      code: codes[index],
      status: result.status,
      data: result.status === "fulfilled" ? result.value : null,
      error: result.status === "rejected" ? result.reason : null
    }));
  }

  /**
   * Estadísticas de scraping
   */
  getStats(results) {
    const total = results.length;
    const successful = results.filter(r => r.data?.success).length;
    const failed = total - successful;
    
    const byManufacturer = {};
    results.forEach(r => {
      if (r.data?.source) {
        byManufacturer[r.data.source] = (byManufacturer[r.data.source] || 0) + 1;
      }
    });
    
    return {
      total,
      successful,
      failed,
      success_rate: ((successful / total) * 100).toFixed(2) + "%",
      by_manufacturer: byManufacturer
    };
  }
}

module.exports = new MasterScraper();

