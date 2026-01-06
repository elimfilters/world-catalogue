/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FRAM SCRAPER - Light Duty Filters
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Extrae información técnica completa de filtros FRAM:
 * - Especificaciones del producto principal
 * - Productos alternativos (Extra Guard, Tough Guard, Ultra Synthetic)
 * - Mapeo a tecnologías ELIMFILTERS™
 * - Generación de múltiples SKUs
 * 
 * URL Base: https://www.fram.com/products/{TYPE}/{CODE}
 * ═══════════════════════════════════════════════════════════════════════════
 */

const axios = require("axios");
const cheerio = require("cheerio");
const { generateSKU, mapToElimTechnology } = require("../../config/elimfilters.rules");

class FramScraper {
  constructor() {
    this.baseUrl = "https://www.fram.com/products";
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept-Language": "en-US,en;q=0.9"
    };
  }

  /**
   * Busca un código en FRAM y extrae toda la información
   * @param {string} code - Código a buscar (ej: "PH3600")
   * @param {string} filterType - Tipo: oil-filters, air-filters, cabin-filters, fuel-filters
   * @returns {Object} Datos completos del filtro + alternativos
   */
  async scrapeProduct(code, filterType = "oil-filters") {
    try {
      console.log(`🔍 Buscando en FRAM: ${code}`);
      
      const url = `${this.baseUrl}/${filterType}/${code}`;
      const response = await axios.get(url, { headers: this.headers });
      const $ = cheerio.load(response.data);

      // 1. EXTRAER PRODUCTO PRINCIPAL
      const mainProduct = this.extractMainProduct($, code);
      
      // 2. EXTRAER PRODUCTOS ALTERNATIVOS (Extra Guard, Tough Guard, Ultra)
      const alternatives = this.extractAlternatives($, code);
      
      // 3. MAPEAR A TECNOLOGÍAS ELIMFILTERS™
      const mappedProducts = this.mapToElimFilters(mainProduct, alternatives);
      
      // 4. GENERAR SKUs
      const skus = this.generateSKUs(mappedProducts);

      return {
        success: true,
        source: "FRAM",
        input_code: code,
        main_product: mainProduct,
        alternatives: alternatives,
        mapped_products: mappedProducts,
        generated_skus: skus,
        total_products: skus.length
      };

    } catch (error) {
      console.error(`❌ Error scrapeando FRAM ${code}:`, error.message);
      return {
        success: false,
        source: "FRAM",
        input_code: code,
        error: error.message
      };
    }
  }

  /**
   * Extrae información del producto principal
   */
  extractMainProduct($, code) {
    try {
      return {
        code: code,
        description: $("h1.product-title, .product-name").text().trim(),
        product_line: this.extractProductLine($),
        specs: {
          height_inch: this.extractSpec($, "Height", "inch"),
          outer_diameter_inch: this.extractSpec($, "Outer Diameter", "inch"),
          thread_size: this.extractSpec($, "Thread Size", null),
          gasket_diameter_inch: this.extractSpec($, "Gasket Diameter", "inch"),
          micron_rating: this.extractMicronRating($),
          media_type: this.extractMediaType($),
          anti_drainback: this.hasAntiDrainback($),
          silicone_valve: this.hasSiliconeValve($),
          efficiency: this.extractSpec($, "Efficiency", "%"),
          dirt_capacity_grams: this.extractSpec($, "Dirt Holding Capacity", "g"),
          applications: this.extractApplications($),
          fits_vehicles: this.extractVehicleFitment($)
        }
      };
    } catch (error) {
      console.error("Error extrayendo producto principal:", error);
      return { code: code, specs: {} };
    }
  }

  /**
   * Extrae línea de producto (Extra Guard, Tough Guard, Ultra Synthetic)
   */
  extractProductLine($) {
    const title = $("h1, .product-title").text().toLowerCase();
    
    if (title.includes("ultra synthetic")) return "Ultra Synthetic";
    if (title.includes("tough guard")) return "Tough Guard";
    if (title.includes("extra guard")) return "Extra Guard";
    
    return "Standard";
  }

  /**
   * Extrae productos alternativos (otras líneas del mismo filtro)
   */
  extractAlternatives($, baseCode) {
    try {
      const alternatives = [];
      
      // FRAM típicamente muestra variantes en una sección de productos relacionados
      $(".related-products .product-item, .alternative-products .product").each((i, elem) => {
        const $elem = $(elem);
        
        const code = $elem.find(".product-code, .part-number").text().trim();
        const productLine = $elem.find(".product-line, .series-name").text().trim();
        
        if (code && code !== baseCode) {
          alternatives.push({
            code: code,
            product_line: productLine,
            technology_hint: this.mapFramLineToElimTech(productLine)
          });
        }
      });

      // Si no encuentra alternativos en HTML, generar basado en patrón de código
      if (alternatives.length === 0) {
        alternatives.push(...this.generateAlternativesByPattern(baseCode));
      }

      console.log(`✅ Encontrados ${alternatives.length} productos alternativos FRAM`);
      return alternatives;

    } catch (error) {
      console.error("Error extrayendo alternativos:", error);
      return [];
    }
  }

  /**
   * Genera alternativos basados en patrón de código FRAM
   * Ej: PH3600 → XG3600 (Tough Guard), UltraSynth variant
   */
  generateAlternativesByPattern(baseCode) {
    const alternatives = [];
    const numericPart = baseCode.replace(/[A-Z]/gi, "");
    
    // Extra Guard (PH prefix)
    if (baseCode.startsWith("PH")) {
      alternatives.push({
        code: `XG${numericPart}`,
        product_line: "Tough Guard",
        technology_hint: "DURAFLOW™"
      });
      alternatives.push({
        code: `XG${numericPart}-ULTRA`,
        product_line: "Ultra Synthetic",
        technology_hint: "NANOFORCE™"
      });
    }
    
    // Cabin filters (CF prefix)
    if (baseCode.startsWith("CF")) {
      alternatives.push({
        code: `CA${numericPart}`,
        product_line: "Fresh Breeze",
        technology_hint: "MICROKAPPA™"
      });
    }
    
    return alternatives;
  }

  /**
   * Mapea línea de producto FRAM a tecnología ELIMFILTERS™
   */
  mapFramLineToElimTech(productLine) {
    const line = productLine.toLowerCase();
    
    if (line.includes("ultra synthetic") || line.includes("ultra")) {
      return "NANOFORCE™";
    }
    if (line.includes("tough guard") || line.includes("extra guard")) {
      return "DURAFLOW™";
    }
    if (line.includes("fresh breeze") || line.includes("cabin")) {
      return "MICROKAPPA™";
    }
    
    return "DURAFLOW™";
  }

  /**
   * Extrae especificación específica
   */
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

  /**
   * Extrae micronaje
   */
  extractMicronRating($) {
    const text = $("body").text();
    const match = text.match(/(\d+)\s*micron/i);
    return match ? parseInt(match[1]) : 25; // Default 25 micron para FRAM standard
  }

  /**
   * Detecta tipo de media
   */
  extractMediaType($) {
    const text = $("body").text().toLowerCase();
    
    if (text.includes("ultra synthetic") || text.includes("100% synthetic")) {
      return "Sintético 100%";
    }
    if (text.includes("synthetic blend")) {
      return "Mezcla Sintética";
    }
    if (text.includes("cellulose")) {
      return "Celulosa";
    }
    
    return "Celulosa Estándar";
  }

  /**
   * Detecta válvula anti-retorno
   */
  hasAntiDrainback($) {
    const text = $("body").text().toLowerCase();
    return text.includes("anti-drainback") || text.includes("anti-drain");
  }

  /**
   * Detecta válvula de silicona
   */
  hasSiliconeValve($) {
    const text = $("body").text().toLowerCase();
    return text.includes("silicone valve") || text.includes("sure-grip");
  }

  /**
   * Extrae aplicaciones
   */
  extractApplications($) {
    const apps = [];
    $(".application-list li, .fits-list li").each((i, elem) => {
      apps.push($(elem).text().trim());
    });
    return apps;
  }

  /**
   * Extrae vehículos compatibles
   */
  extractVehicleFitment($) {
    const vehicles = [];
    $(".vehicle-fit .vehicle-item, .fitment-list li").each((i, elem) => {
      vehicles.push($(elem).text().trim());
    });
    return vehicles;
  }

  /**
   * Mapea productos a tecnologías ELIMFILTERS™
   */
  mapToElimFilters(mainProduct, alternatives) {
    const mapped = [];
    
    // Producto principal
    const mainTech = mapToElimTechnology(mainProduct.specs);
    mapped.push({
      ...mainProduct,
      elimfilters_technology: mainTech.technology,
      elimfilters_tier: mainTech.tier,
      elimfilters_media: mainTech.mediaType
    });
    
    // Alternativos
    alternatives.forEach(alt => {
      mapped.push({
        code: alt.code,
        product_line: alt.product_line,
        elimfilters_technology: alt.technology_hint,
        elimfilters_tier: alt.technology_hint.includes("NANOFORCE") ? "ELITE" : "STANDARD"
      });
    });
    
    return mapped;
  }

  /**
   * Genera SKUs ELIMFILTERS™
   */
  generateSKUs(mappedProducts) {
    return mappedProducts.map(product => {
      const prefix = this.determinePrefix(product);
      
      return {
        fram_code: product.code,
        elimfilters_sku: generateSKU(prefix, product.code),
        technology: product.elimfilters_technology,
        tier: product.elimfilters_tier,
        description: `Filtro ELIMFILTERS™ ${product.elimfilters_technology}`
      };
    });
  }

  /**
   * Determina prefijo según tipo
   */
  determinePrefix(product) {
    const code = product.code || "";
    
    if (code.startsWith("CA") || code.startsWith("CF")) return "EC1"; // Cabin
    if (code.startsWith("PH") || code.startsWith("XG")) return "EL8"; // Oil
    if (code.startsWith("CA") && product.product_line?.includes("Air")) return "EA1"; // Air
    if (code.startsWith("PS") || code.startsWith("CS")) return "EF9"; // Fuel
    
    return "EL8"; // Default oil
  }
}

module.exports = new FramScraper();
