const googleSheetsService = require("./googlesheets.service");
const mongodbService = require("./mongodb.service");
const dutyDetector = require("./duty.detector");
const masterScraper = require("./scrapers/master.scraper");
const skuGenerator = require("./sku.generator");
const descriptionService = require("./description.service");

class FilterOrchestrator {
  async process(inputCode, manufacturer = "", application = "") {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`🎯 PROCESANDO: ${inputCode}`);
    console.log(`${"=".repeat(60)}\n`);
    
    // PASO 1: Buscar en fuentes existentes
    console.log(`📋 PASO 1: Buscar en fuentes existentes...`);
    
    const sheetsResult = await googleSheetsService.searchCode(inputCode);
    if (sheetsResult) {
      console.log(`✅ Encontrado en Google Sheets`);
      return { 
        success: true,
        source: "GOOGLE_SHEETS", 
        data: sheetsResult 
      };
    }
    
    const mongoResult = await mongodbService.searchCode(inputCode);
    if (mongoResult) {
      console.log(`✅ Encontrado en MongoDB`);
      return { 
        success: true,
        source: "MONGODB", 
        data: mongoResult 
      };
    }
    
    console.log(`ℹ️  No encontrado en fuentes existentes\n`);
    
    // PASO 2: Detectar DUTY
    console.log(`📋 PASO 2: Detectar DUTY...`);
    const duty = dutyDetector.detect(manufacturer, application);
    console.log(`   Resultado: ${duty}\n`);
    
    // PASO 3: SCRAPING COMPLETO con Master Scraper
    console.log(`📋 PASO 3: Scraping completo (specs + cross-reference)...`);
    
    const scrapingResult = await masterScraper.scrape(inputCode);
    
    if (!scrapingResult.success) {
      console.log(`⚠️  No se pudo scrapear el código\n`);
      
      // Fallback: SKU directo
      const filterType = "OIL";
      const directTrilogy = skuGenerator.generateDirectTrilogy(inputCode, filterType);
      
      return {
        success: true,
        source: "ELIMFILTERS_DIRECT",
        input_code: inputCode,
        duty,
        filter_type: filterType,
        trilogy: directTrilogy,
        note: "SKU generado directamente sin scraping"
      };
    }
    
    console.log(`✅ Scraping exitoso: ${scrapingResult.source}\n`);
    
    // PASO 4: Generar TRILOGY con SKUs y SPECS
    console.log(`📋 PASO 4: Generar TRILOGY con especificaciones...`);
    
    const enrichedTrilogy = this.buildEnrichedTrilogy(
      scrapingResult,
      duty,
      inputCode
    );
    
    console.log(`\n✅ PROCESO COMPLETADO`);
    console.log(`${"=".repeat(60)}\n`);
    
    return {
      success: true,
      source: "SCRAPING_COMPLETE",
      scraper_used: scrapingResult.source,
      detected_manufacturer: scrapingResult.detected_manufacturer,
      input_code: inputCode,
      duty,
      trilogy: enrichedTrilogy,
      raw_scraping_data: scrapingResult
    };
  }

  /**
   * Construye TRILOGY enriquecido con especificaciones técnicas
   */
  buildEnrichedTrilogy(scrapingResult, duty, inputCode) {
    const trilogy = [];
    
    // Tomar datos del scraping
    const mainProduct = scrapingResult.main_product || {};
    const specs = mainProduct.specs || {};
    const skus = scrapingResult.generated_skus || [];
    
    // Si hay SKUs generados, usarlos
    if (skus.length > 0) {
      // Tomar hasta 3 SKUs (TRILOGY)
      const trilogySkus = skus.slice(0, 3);
      
      trilogySkus.forEach((skuData, index) => {
        const variant = this.determineVariant(skuData, index);
        
        trilogy.push({
          // SKU ELIMFILTERS
          sku: skuData.elimfilters_sku,
          prefix: skuData.elimfilters_sku.substring(0, 3),
          correlative: skuData.elimfilters_sku.substring(3),
          
          // Clasificación
          filter_type: this.determineFilterType(mainProduct),
          variant: variant,
          duty: duty,
          tier_system: variant,
          
          // Códigos
          input_code: inputCode,
          cross_reference_code: skuData.donaldson_code || skuData.fram_code || skuData.racor_code,
          oem_codes: specs.oem_codes || [],
          
          // Tecnología
          technology: skuData.technology,
          media_type: specs.media_type || mainProduct.elimfilters_media,
          
          // Dimensiones físicas
          height_mm: specs.height_mm,
          height_inch: specs.height_inch,
          outer_diameter_mm: specs.outer_diameter_mm,
          outer_diameter_inch: specs.outer_diameter_inch || specs.gasket_diameter_inch,
          inner_diameter_mm: specs.inner_diameter_mm,
          thread_size: specs.thread_size,
          
          // Empaque/Gasket
          gasket_od_mm: specs.gasket_od_mm,
          gasket_id_mm: specs.gasket_id_mm,
          
          // Especificaciones técnicas
          micron_rating: specs.micron_rating,
          efficiency: specs.efficiency,
          max_pressure_psi: specs.max_pressure_psi,
          
          // Características
          anti_drainback_valve: specs.anti_drainback || specs.silicone_valve || false,
          dirt_holding_capacity_g: specs.dirt_capacity_grams,
          service_life_hours: specs.service_life_hours,
          
          // Fluidos
          fluid_compatibility: this.determineFluidCompatibility(mainProduct),
          biodiesel_compatible: this.isBiodieselCompatible(specs),
          
          // Aplicaciones
          applications: specs.applications || specs.fits_vehicles || [],
          equipment_applications: specs.compatible_models || [],
          
          // Descripción
          description: skuData.description || `${variant} ${skuData.technology}`,
          
          // Metadata
          source: "SCRAPING_WITH_SPECS",
          generated_at: new Date().toISOString()
        });

        // Enriquecer con descripción
        const enriched = descriptionService.enrichSKU(trilogy[trilogy.length - 1]);
        trilogy[trilogy.length - 1] = enriched;
      });
    } else {
      // Fallback: generar TRILOGY básico
      ["STANDARD", "PERFORMANCE", "ELITE"].forEach(variant => {
        const sku = skuGenerator.generateDirect(inputCode, "OIL", variant);
        
        trilogy.push({
          ...sku,
          duty,
          // Agregar specs disponibles
          height_mm: specs.height_mm,
          outer_diameter_mm: specs.outer_diameter_mm,
          micron_rating: specs.micron_rating,
          applications: specs.applications || []
        });
      });
    }
    
    return trilogy;
  }

  determineVariant(skuData, index) {
    // Detectar tier del skuData
    const tier = skuData.tier || skuData.elimfilters_tier || "";
    
    if (tier === "ELITE" || skuData.technology?.includes("NANOFORCE")) {
      return "ELITE";
    }
    if (tier === "PERFORMANCE" || skuData.technology?.includes("SYNTRAX")) {
      return "PERFORMANCE";
    }
    
    // Por posición
    const variants = ["STANDARD", "PERFORMANCE", "ELITE"];
    return variants[index] || "STANDARD";
  }

  determineFilterType(product) {
    const desc = (product.description || "").toLowerCase();
    
    if (desc.includes("oil") || desc.includes("aceite") || desc.includes("lubri")) return "OIL";
    if (desc.includes("air") || desc.includes("aire")) return "AIR";
    if (desc.includes("fuel") || desc.includes("combustible")) return "FUEL";
    if (desc.includes("hydraulic") || desc.includes("hidráulico")) return "HYDRAULIC";
    if (desc.includes("cabin") || desc.includes("cabina")) return "CABIN";
    if (desc.includes("coolant") || desc.includes("refrigerante")) return "COOLANT";
    
    return "OIL";
  }

  determineFluidCompatibility(product) {
    const fluids = [];
    const desc = (product.description || "").toLowerCase();
    
    if (desc.includes("synthetic")) fluids.push("Synthetic Oil");
    if (desc.includes("mineral")) fluids.push("Mineral Oil");
    if (desc.includes("diesel")) fluids.push("Diesel");
    if (desc.includes("biodiesel")) fluids.push("Biodiesel");
    if (desc.includes("gasoline") || desc.includes("gasolina")) fluids.push("Gasoline");
    
    return fluids.length > 0 ? fluids.join(", ") : "Universal";
  }

  isBiodieselCompatible(specs) {
    const mediaType = (specs.media_type || "").toLowerCase();
    return mediaType.includes("synthetic") || mediaType.includes("aquabloc");
  }
}

module.exports = new FilterOrchestrator();

