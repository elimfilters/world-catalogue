/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RACOR SCRAPER - Clasificación Inteligente por Serie
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ET9/AQUAGUARD™ (EXCLUSIVO):
 *   - Turbinas Series FH: 1000FH, 900FH, 500FH
 *   - Cartuchos Serie 2020 (2020PM, 2020TM, 2020SM) para estas turbinas
 * 
 * EF9/SYNTEPORE™ (Resto):
 *   - Separadores estándar (R90P, etc.)
 *   - Spin-on series
 *   - Otros modelos Racor
 * 
 * URL Base: https://www.parker.com/racor/{CODE}
 * ═══════════════════════════════════════════════════════════════════════════
 */

const axios = require("axios");
const cheerio = require("cheerio");
const { generateSKU } = require("../../config/elimfilters.rules");

class RacorScraper {
  constructor() {
    this.baseUrl = "https://www.parker.com/racor";
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept-Language": "en-US,en;q=0.9"
    };
    
    // DEFINICIÓN EXCLUSIVA ET9: Turbinas FH + Cartuchos 2020
    this.ET9_TURBINE_MODELS = ["1000FH", "900FH", "500FH"];
    this.ET9_CARTRIDGE_SERIES = ["2020PM", "2020TM", "2020SM", "2020"];
  }

  /**
   * Busca un código en Racor y clasifica correctamente
   * @param {string} code - Código a buscar (ej: "1000FH", "2020PM", "R90P")
   * @returns {Object} Datos completos con clasificación correcta
   */
  async scrapeProduct(code) {
    try {
      console.log(`🔍 Buscando en Racor: ${code}`);
      
      const url = `${this.baseUrl}/${code}`;
      const response = await axios.get(url, { headers: this.headers });
      const $ = cheerio.load(response.data);

      // 1. EXTRAER PRODUCTO PRINCIPAL
      const mainProduct = this.extractMainProduct($, code);
      
      // 2. CLASIFICAR: ¿Es Turbina FH o Cartucho 2020 (ET9) o resto (EF9)?
      const classification = this.classifyProduct(mainProduct, code);
      
      // 3. EXTRAER ALTERNATIVOS
      const alternatives = this.extractAlternatives($, classification);
      
      // 4. MAPEAR SEGÚN CLASIFICACIÓN
      const mappedProducts = this.mapToElimFilters(mainProduct, alternatives, classification);
      
      // 5. GENERAR SKUs
      const skus = this.generateSKUs(mappedProducts);

      return {
        success: true,
        source: "Racor",
        input_code: code,
        classification: classification,
        main_product: mainProduct,
        alternatives: alternatives,
        mapped_products: mappedProducts,
        generated_skus: skus,
        total_products: skus.length
      };

    } catch (error) {
      console.error(`❌ Error scrapeando Racor ${code}:`, error.message);
      return {
        success: false,
        source: "Racor",
        input_code: code,
        error: error.message
      };
    }
  }

  /**
   * CLASIFICA el producto: ET9 (Turbinas FH + 2020) o EF9 (Resto)
   */
  classifyProduct(product, code) {
    const productText = (product.description || "").toUpperCase();
    const codeUpper = code.toUpperCase();
    
    // VERIFICAR SI ES TURBINA FH
    const isTurbineFH = this.ET9_TURBINE_MODELS.some(model => 
      codeUpper.includes(model) || productText.includes(model)
    );
    
    if (isTurbineFH) {
      return {
        category: "ET9",
        technology: "AQUAGUARD™",
        type: "Turbina FH",
        prefix: "ET9",
        reason: "Turbina FH Series"
      };
    }
    
    // VERIFICAR SI ES CARTUCHO SERIE 2020 (para turbinas FH)
    const isCartridge2020 = this.ET9_CARTRIDGE_SERIES.some(series => 
      codeUpper.includes(series) || codeUpper.startsWith("2020")
    );
    
    if (isCartridge2020) {
      return {
        category: "ET9",
        technology: "AQUAGUARD™",
        type: "Cartucho 2020 (para Turbinas FH)",
        prefix: "ET9",
        reason: "Cartucho Serie 2020"
      };
    }
    
    // RESTO: Separadores estándar (R90P, etc.)
    return {
      category: "EF9",
      technology: "SYNTEPORE™",
      type: "Separador Estándar",
      prefix: "EF9",
      reason: "Separador estándar (no FH)"
    };
  }

  /**
   * Extrae información del producto principal
   */
  extractMainProduct($, code) {
    try {
      return {
        code: code,
        description: $("h1.product-name, .product-title").text().trim(),
        series: this.extractSeries($),
        specs: {
          product_type: this.extractProductType($),
          micron_rating: this.extractMicronRating($),
          flow_rate_gph: this.extractSpec($, "Flow Rate", "GPH"),
          flow_rate_lph: this.extractSpec($, "Flow Rate", "LPH"),
          max_pressure_psi: this.extractSpec($, "Maximum Pressure", "PSI"),
          
          // Detalles físicos
          bowl_type: this.extractBowlType($),
          bowl_material: this.extractBowlMaterial($),
          bowl_capacity_oz: this.extractSpec($, "Bowl Capacity", "oz"),
          drain_valve: this.extractDrainValve($),
          sight_glass: this.hasSightGlass($),
          
          housing_material: this.extractSpec($, "Housing Material", null),
          seal_material: this.extractSpec($, "Seal Material", null),
          media_type: this.extractMediaType($),
          water_separation_efficiency: this.extractWaterSeparation($),
          inlet_outlet_size: this.extractSpec($, "Port Size", null),
          
          // Características técnicas
          turbine_fh: this.isTurbineFH($),
          cartridge_2020: this.isCartridge2020($),
          aquabloc: this.isAquablocMedia($),
          spin_on: this.isSpinOnType($),
          
          applications: this.extractApplications($),
          compatible_models: this.extractCompatibleModels($)
        }
      };
    } catch (error) {
      console.error("Error extrayendo producto principal:", error);
      return { code: code, specs: {} };
    }
  }

  /**
   * Detecta si es Turbina FH
   */
  isTurbineFH($) {
    const text = $("body").text().toUpperCase();
    return this.ET9_TURBINE_MODELS.some(model => text.includes(model));
  }

  /**
   * Detecta si es Cartucho Serie 2020
   */
  isCartridge2020($) {
    const text = $("body").text().toUpperCase();
    return this.ET9_CARTRIDGE_SERIES.some(series => text.includes(series));
  }

  extractProductType($) {
    const text = $("body").text().toLowerCase();
    
    if (text.includes("turbine") && (text.includes("1000fh") || text.includes("900fh") || text.includes("500fh"))) {
      return "Turbina FH Series";
    }
    if (text.includes("2020")) {
      return "Cartucho 2020 Series";
    }
    if (text.includes("cartridge") || text.includes("element")) {
      return "Cartucho Filtro";
    }
    if (text.includes("fuel/water separator") || text.includes("separator")) {
      return "Separador Combustible/Agua";
    }
    
    return "Filtro Racor";
  }

  extractSeries($) {
    const title = $("h1, .product-title").text().toUpperCase();
    
    if (title.includes("1000FH")) return "Turbina 1000FH";
    if (title.includes("900FH")) return "Turbina 900FH";
    if (title.includes("500FH")) return "Turbina 500FH";
    if (title.includes("2020PM")) return "Cartucho 2020PM";
    if (title.includes("2020TM")) return "Cartucho 2020TM";
    if (title.includes("2020SM")) return "Cartucho 2020SM";
    if (title.includes("2020")) return "Cartucho 2020 Series";
    if (title.includes("TURBINE")) return "Turbine Series";
    if (title.includes("SPIN-ON")) return "Spin-On Series";
    if (title.includes("R90")) return "R90 Series";
    
    return "Standard";
  }

  extractBowlType($) {
    const text = $("body").text().toLowerCase();
    
    if (text.includes("clear bowl") || text.includes("transparent")) {
      return "Plástica Transparente";
    }
    if (text.includes("metal bowl") || text.includes("aluminum")) {
      return "Metálica";
    }
    
    return "Estándar";
  }

  extractBowlMaterial($) {
    const text = $("body").text().toLowerCase();
    
    if (text.includes("polycarbonate")) return "Policarbonato";
    if (text.includes("nylon")) return "Nylon";
    if (text.includes("aluminum")) return "Aluminio";
    
    return null;
  }

  extractDrainValve($) {
    const text = $("body").text().toLowerCase();
    
    if (text.includes("automatic drain")) return "Purgador Automático";
    if (text.includes("manual drain") || text.includes("petcock")) return "Purgador Manual";
    if (text.includes("drain valve")) return "Válvula de Drenaje";
    
    return null;
  }

  hasSightGlass($) {
    const text = $("body").text().toLowerCase();
    return text.includes("sight glass") || text.includes("clear bowl");
  }

  extractMediaType($) {
    const text = $("body").text().toLowerCase();
    
    if (text.includes("aquabloc")) return "Aquabloc®";
    if (text.includes("turbine")) return "Turbine™";
    
    return "Media Estándar";
  }

  extractWaterSeparation($) {
    const text = $("body").text();
    const match = text.match(/(\d+)%\s*(?:water\s*separation|efficiency)/i);
    return match ? parseInt(match[1]) : null;
  }

  isAquablocMedia($) {
    return $("body").text().toLowerCase().includes("aquabloc");
  }

  isSpinOnType($) {
    return $("body").text().toLowerCase().includes("spin-on");
  }

  extractMicronRating($) {
    const text = $("body").text();
    
    const codeMatch = text.match(/(\d+)PM/i);
    if (codeMatch) return parseInt(codeMatch[1]);
    
    const specMatch = text.match(/(\d+)\s*micron/i);
    if (specMatch) return parseInt(specMatch[1]);
    
    return null;
  }

  extractSpec($, label, unit) {
    try {
      const specRow = $(`.spec-row:contains("${label}"), tr:contains("${label}")`);
      let value = specRow.find(".spec-value, td").eq(1).text().trim();
      
      if (unit) {
        const regex = new RegExp(`(\\d+\\.?\\d*)\\s*${unit}`, "i");
        const match = value.match(regex);
        return match ? parseFloat(match[1]) : null;
      }
      
      return value || null;
    } catch {
      return null;
    }
  }

  extractApplications($) {
    const apps = [];
    $(".application-list li, .use-case li").each((i, elem) => {
      apps.push($(elem).text().trim());
    });
    return apps;
  }

  extractCompatibleModels($) {
    const models = [];
    $(".compatible-models li, .fits-models li").each((i, elem) => {
      models.push($(elem).text().trim());
    });
    return models;
  }

  /**
   * Extrae alternativos según clasificación
   */
  extractAlternatives($, classification) {
    try {
      const alternatives = [];
      
      $(".alternative-products .product, .related-filters .filter-item").each((i, elem) => {
        const $elem = $(elem);
        
        const code = $elem.find(".product-code, .part-number").text().trim();
        const micron = this.extractMicronFromElement($elem);
        
        if (code) {
          alternatives.push({
            code: code,
            micron_rating: micron,
            classification: classification
          });
        }
      });

      console.log(`✅ Encontrados ${alternatives.length} productos alternativos Racor`);
      return alternatives;

    } catch (error) {
      console.error("Error extrayendo alternativos:", error);
      return [];
    }
  }

  extractMicronFromElement($elem) {
    const text = $elem.text();
    const match = text.match(/(\d+)\s*(?:micron|PM)/i);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Mapea productos según clasificación ET9 o EF9
   */
  mapToElimFilters(mainProduct, alternatives, classification) {
    const mapped = [];
    
    // Producto principal
    mapped.push({
      ...mainProduct,
      elimfilters_technology: classification.technology,
      elimfilters_category: classification.category,
      elimfilters_type: classification.type,
      classification_reason: classification.reason,
      elimfilters_tier: mainProduct.specs.aquabloc ? "ELITE" : "STANDARD"
    });
    
    // Alternativos con misma clasificación
    alternatives.forEach(alt => {
      mapped.push({
        code: alt.code,
        micron_rating: alt.micron_rating,
        elimfilters_technology: classification.technology,
        elimfilters_category: classification.category,
        elimfilters_type: classification.type,
        elimfilters_tier: "STANDARD"
      });
    });
    
    return mapped;
  }

  /**
   * Genera SKUs según clasificación (ET9 o EF9)
   */
  generateSKUs(mappedProducts) {
    return mappedProducts.map(product => ({
      racor_code: product.code,
      elimfilters_sku: generateSKU(product.elimfilters_category, product.code),
      technology: product.elimfilters_technology,
      category: product.elimfilters_category,
      type: product.elimfilters_type,
      tier: product.elimfilters_tier,
      classification_reason: product.classification_reason,
      description: `${product.elimfilters_category} ${product.elimfilters_technology} - ${product.elimfilters_type}`
    }));
  }
}

module.exports = new RacorScraper();
