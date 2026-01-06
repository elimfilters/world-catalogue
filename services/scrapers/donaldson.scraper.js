/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DONALDSON SCRAPER - Heavy Duty Filters
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Extrae información técnica completa de filtros Donaldson:
 * - Especificaciones del producto principal
 * - Productos alternativos (TRILOGY + variantes)
 * - Mapeo a tecnologías ELIMFILTERS™
 * - Generación de múltiples SKUs
 * 
 * URL Base: https://shop.donaldson.com/store/es-us/product/{CODE}
 * ═══════════════════════════════════════════════════════════════════════════
 */

const axios = require("axios");
const cheerio = require("cheerio");
const { generateSKU, mapToElimTechnology } = require("../../config/elimfilters.rules");

class DonaldsonScraper {
  constructor() {
    this.baseUrl = "https://shop.donaldson.com/store/es-us/product";
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept-Language": "es-US,es;q=0.9,en;q=0.8"
    };
  }

  /**
   * Busca un código en Donaldson y extrae toda la información
   * @param {string} code - Código a buscar (ej: "P551808", "1R1808")
   * @returns {Object} Datos completos del filtro + alternativos
   */
  async scrapeProduct(code) {
    try {
      console.log(`🔍 Buscando en Donaldson: ${code}`);
      
      const url = `${this.baseUrl}/${code}`;
      const response = await axios.get(url, { headers: this.headers });
      const $ = cheerio.load(response.data);

      // 1. EXTRAER PRODUCTO PRINCIPAL
      const mainProduct = this.extractMainProduct($, code);
      
      // 2. EXTRAER PRODUCTOS ALTERNATIVOS
      const alternatives = this.extractAlternatives($);
      
      // 3. MAPEAR A TECNOLOGÍAS ELIMFILTERS™
      const mappedProducts = this.mapToElimFilters(mainProduct, alternatives);
      
      // 4. GENERAR SKUs
      const skus = this.generateSKUs(mappedProducts);

      return {
        success: true,
        source: "Donaldson",
        input_code: code,
        main_product: mainProduct,
        alternatives: alternatives,
        mapped_products: mappedProducts,
        generated_skus: skus,
        total_products: skus.length
      };

    } catch (error) {
      console.error(`❌ Error scrapeando Donaldson ${code}:`, error.message);
      return {
        success: false,
        source: "Donaldson",
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
        description: $("h1.product-name").text().trim(),
        specs: {
          height_mm: this.extractSpec($, "Altura", "mm"),
          height_inch: this.extractSpec($, "Altura", "inch"),
          outer_diameter_mm: this.extractSpec($, "Diámetro exterior", "mm"),
          outer_diameter_inch: this.extractSpec($, "Diámetro exterior", "inch"),
          inner_diameter_mm: this.extractSpec($, "Diámetro interior", "mm"),
          thread_size: this.extractSpec($, "Rosca", null),
          gasket_od_mm: this.extractSpec($, "Empaque OD", "mm"),
          gasket_id_mm: this.extractSpec($, "Empaque ID", "mm"),
          micron_rating: this.extractSpec($, "Micron", null),
          media_type: this.extractMediaType($),
          anti_drainback: this.extractSpec($, "Válvula anti-retorno", null),
          efficiency: this.extractSpec($, "Eficiencia", "%"),
          max_pressure_psi: this.extractSpec($, "Presión máxima", "PSI"),
          service_life_hours: this.extractSpec($, "Vida útil", "horas"),
          applications: this.extractApplications($),
          oem_codes: this.extractOEMCodes($)
        }
      };
    } catch (error) {
      console.error("Error extrayendo producto principal:", error);
      return { code: code, specs: {} };
    }
  }

  /**
   * Extrae productos alternativos del tab "Productos alternativos"
   */
  extractAlternatives($) {
    try {
      const alternatives = [];
      
      // Buscar en el tab de productos alternativos
      $('[data-tab="productos-alternativos"] .producto, .alternative-product').each((i, elem) => {
        const $elem = $(elem);
        
        const code = $elem.find("h3, .product-code").text().trim();
        const description = $elem.find("p, .product-description").text().trim();
        const note = $elem.find("em, .product-note").text().trim();
        
        if (code) {
          alternatives.push({
            code: code,
            description: description,
            note: note,
            dimensions: this.extractDimensionsFromNote(note),
            technology_hint: this.detectTechnologyFromNote(note)
          });
        }
      });

      console.log(`✅ Encontrados ${alternatives.length} productos alternativos`);
      return alternatives;

    } catch (error) {
      console.error("Error extrayendo alternativos:", error);
      return [];
    }
  }

  /**
   * Extrae una especificación específica del HTML
   */
  extractSpec($, label, unit) {
    try {
      const specRow = $(`td:contains("${label}")`).closest("tr");
      let value = specRow.find("td").eq(1).text().trim();
      
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
   * Detecta el tipo de media filtrante
   */
  extractMediaType($) {
    const description = $("body").text().toLowerCase();
    
    if (description.includes("ultra-web") || description.includes("blue") || description.includes("dbl")) {
      return "Nanofibra Sintética (Ultra-Web/Blue)";
    }
    if (description.includes("synteq")) {
      return "Sintético (Synteq)";
    }
    if (description.includes("celulosa") || description.includes("standard")) {
      return "Celulosa Estándar";
    }
    
    return "No especificado";
  }

  /**
   * Extrae aplicaciones del filtro
   */
  extractApplications($) {
    const applications = [];
    
    $('[data-section="applications"] li, .application-item').each((i, elem) => {
      applications.push($(elem).text().trim());
    });
    
    return applications;
  }

  /**
   * Extrae códigos OEM
   */
  extractOEMCodes($) {
    const oemCodes = [];
    
    $('[data-section="cross-reference"] .oem-code, .reference-code').each((i, elem) => {
      oemCodes.push($(elem).text().trim());
    });
    
    return oemCodes;
  }

  /**
   * Detecta tecnología ELIMFILTERS™ desde la nota de Donaldson
   */
  detectTechnologyFromNote(note) {
    if (!note) return null;
    
    const noteLower = note.toLowerCase();
    
    if (noteLower.includes("blue") || noteLower.includes("ultra-web")) {
      return "NANOFORCE™";
    }
    if (noteLower.includes("estándar") || noteLower.includes("standard")) {
      return "DURAFLOW™";
    }
    if (noteLower.includes("synteq")) {
      return "DURAFLOW™"; // Performance tier
    }
    
    return null;
  }

  /**
   * Extrae dimensiones de la nota (ej: "118 MM")
   */
  extractDimensionsFromNote(note) {
    const match = note.match(/(\d+)\s*mm/i);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Mapea todos los productos a tecnologías ELIMFILTERS™
   */
  mapToElimFilters(mainProduct, alternatives) {
    const mapped = [];
    
    // Mapear producto principal
    const mainTech = mapToElimTechnology(mainProduct.specs);
    mapped.push({
      ...mainProduct,
      elimfilters_technology: mainTech.technology,
      elimfilters_tier: mainTech.tier,
      elimfilters_media: mainTech.mediaType
    });
    
    // Mapear alternativos
    alternatives.forEach(alt => {
      const tech = alt.technology_hint || mapToElimTechnology({ mediaType: alt.note });
      mapped.push({
        code: alt.code,
        description: alt.description,
        note: alt.note,
        elimfilters_technology: tech.technology || tech,
        elimfilters_tier: tech.tier || "STANDARD"
      });
    });
    
    return mapped;
  }

  /**
   * Genera SKUs ELIMFILTERS™ para todos los productos
   */
  generateSKUs(mappedProducts) {
    return mappedProducts.map(product => {
      // Determinar prefijo según tipo de filtro
      const prefix = this.determinePrefix(product);
      
      return {
        donaldson_code: product.code,
        elimfilters_sku: generateSKU(prefix, product.code),
        technology: product.elimfilters_technology,
        tier: product.elimfilters_tier,
        description: `Filtro ELIMFILTERS™ ${product.elimfilters_technology}`
      };
    });
  }

  /**
   * Determina el prefijo ELIMFILTERS™ según el tipo de filtro
   */
  determinePrefix(product) {
    const desc = (product.description || "").toLowerCase();
    
    if (desc.includes("aire") || desc.includes("air")) {
      return desc.includes("carcasa") || desc.includes("housing") ? "EA2" : "EA1";
    }
    if (desc.includes("aceite") || desc.includes("lubri") || desc.includes("oil")) {
      return "EL8";
    }
    if (desc.includes("combustible") || desc.includes("fuel")) {
      return "EF9";
    }
    if (desc.includes("hidráulico") || desc.includes("hydraulic")) {
      return "EH6";
    }
    if (desc.includes("refrigerante") || desc.includes("coolant")) {
      return "EW7";
    }
    if (desc.includes("cabina") || desc.includes("cabin")) {
      return "EC1";
    }
    if (desc.includes("secante") || desc.includes("dryer")) {
      return "ED4";
    }
    if (desc.includes("separador") || desc.includes("separator")) {
      return "ES9";
    }
    
    return "EL8"; // Default: Oil filter
  }
}

module.exports = new DonaldsonScraper();
