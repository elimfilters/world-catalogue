const prefixesConfig = require("../config/elimfilters.prefixes.json");

class SKUGenerator {
  constructor() {
    this.prefixes = prefixesConfig.prefixes;
    this.variants = prefixesConfig.trilogy_variants;
  }

  /**
   * Genera SKU desde código de cross-reference (Donaldson/FRAM)
   * Usa últimos 4 dígitos del código DONALDSON/FRAM
   */
  generate(crossReferenceCode, filterType = "OIL", variant = "PERFORMANCE") {
    console.log(`📦 Generando SKU desde cross-reference: ${crossReferenceCode}`);
    
    const digitsOnly = crossReferenceCode.replace(/\D/g, "");
    const last4 = digitsOnly.slice(-4).padStart(4, "0");
    
    const prefix = this.getPrefix(filterType);
    const sku = `${prefix}${last4}`;
    
    console.log(`   ✅ SKU generado: ${sku}`);
    
    return {
      sku,
      prefix,
      correlative: last4,
      filter_type: filterType,
      variant,
      variant_info: this.variants[variant],
      cross_reference_code: crossReferenceCode,
      source: "CROSS_REFERENCE",
      generated_at: new Date().toISOString()
    };
  }

  /**
   * Genera SKU DIRECTO cuando NO hay cross-reference
   * Usa últimos 4 dígitos del código ORIGINAL de entrada
   */
  generateDirect(originalCode, filterType = "OIL", variant = "STANDARD") {
    console.log(`📦 Generando SKU DIRECTO desde: ${originalCode}`);
    
    const digitsOnly = originalCode.replace(/\D/g, "");
    
    let correlative;
    if (digitsOnly.length >= 4) {
      correlative = digitsOnly.slice(-4);
    } else if (digitsOnly.length > 0) {
      correlative = digitsOnly.padStart(4, "0");
    } else {
      // Si no hay números, usar hash del código completo
      const hash = this.simpleHash(originalCode);
      correlative = hash.toString().padStart(4, "0");
    }
    
    const prefix = this.getPrefix(filterType);
    const sku = `${prefix}${correlative}`;
    
    console.log(`   Últimos 4 dígitos: ${correlative}`);
    console.log(`   ✅ SKU DIRECTO: ${sku}`);
    
    return {
      sku,
      prefix,
      correlative,
      filter_type: filterType,
      variant,
      variant_info: this.variants[variant],
      original_code: originalCode,
      source: "ELIMFILTERS_DIRECT",
      note: "Filtro fabricado directamente por ELIMFILTERS sin equivalente Donaldson/FRAM",
      generated_at: new Date().toISOString()
    };
  }

  /**
   * Genera TRILOGY desde cross-reference (con códigos Donaldson/FRAM)
   */
  generateTrilogy(crossReferences, filterType = "OIL") {
    console.log(`🎯 Generando TRILOGY desde cross-reference`);
    const results = [];
    
    if (crossReferences.standard) {
      results.push(this.generate(crossReferences.standard, filterType, "STANDARD"));
    }
    
    if (crossReferences.performance) {
      results.push(this.generate(crossReferences.performance, filterType, "PERFORMANCE"));
    }
    
    if (crossReferences.elite) {
      results.push(this.generate(crossReferences.elite, filterType, "ELITE"));
    }
    
    console.log(`   ✅ TRILOGY completo: ${results.length} SKUs`);
    return results;
  }

  /**
   * Genera TRILOGY DIRECTO (sin cross-reference)
   * Usa el mismo código base, pero con 3 variantes
   */
  generateDirectTrilogy(originalCode, filterType = "OIL") {
    console.log(`🎯 Generando TRILOGY DIRECTO para: ${originalCode}`);
    
    const results = [
      this.generateDirect(originalCode, filterType, "STANDARD"),
      this.generateDirect(originalCode, filterType, "PERFORMANCE"),
      this.generateDirect(originalCode, filterType, "ELITE")
    ];
    
    // Los 3 SKUs tienen el mismo número, pero diferentes variantes
    console.log(`   ✅ TRILOGY DIRECTO: ${results.length} variantes del SKU ${results[0].sku}`);
    return results;
  }

  /**
   * Obtiene prefijo según tipo de filtro
   */
  getPrefix(filterType) {
    const typeToPrefix = {
      OIL: "EL8",
      LUBE: "EL8",
      AIR: "EA1",
      FUEL: "EF9",
      HYDRAULIC: "EH6",
      CABIN: "EC1",
      MARINE: "EM9",
      TURBINE: "ET9",
      FUEL_SEPARATOR: "ES9",
      COOLANT: "EW7",
      AIR_DRYER: "ED4"
    };
    
    return typeToPrefix[filterType.toUpperCase()] || "EL8";
  }

  /**
   * Hash simple para códigos sin números
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash) % 10000;
  }
}

module.exports = new SKUGenerator();
