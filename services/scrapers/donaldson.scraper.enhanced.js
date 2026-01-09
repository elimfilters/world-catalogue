const axios = require("axios");
const cheerio = require("cheerio");
const getDonaldsonAlternatives = require("./getDonaldsonAlternatives");
const donaldsonMapper = require("../mappers/donaldson.mapper");
const skuGenerator = require("../sku.generator");

/**
 * DONALDSON SCRAPER ENHANCED
 * Versión mejorada que mapea todas las especificaciones a las columnas del sheet
 */
async function scrapeDonaldsonEnhanced(code) {
  const url = `https://shop.donaldson.com/store/en-us/product/${code}/80`;
  
  try {
    console.log(`🔍 Scraping Donaldson: ${code}`);
    
    const { data: html } = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(html);
    
    // === EXTRACCIÓN BÁSICA ===
    const descripcion = $(".product-name").first().text().trim();
    
    // === EXTRACCIÓN DE ESPECIFICACIONES ===
    const specs = {};
    $(".spec-table tr").each((i, el) => {
      const label = $(el).find("td").eq(0).text().trim();
      const value = $(el).find("td").eq(1).text().trim();
      if (label && value) {
        specs[label] = value;
      }
    });
    
    console.log(`   📊 Especificaciones encontradas: ${Object.keys(specs).length}`);
    
    // === EXTRACCIÓN DE ALTERNATIVAS SIMPLES ===
    const alternativos = [];
    $("div#crossReferencesList .cross-reference-number").each((i, el) => {
      const val = $(el).text().trim();
      if (val) alternativos.push(val);
    });
    
    // === EXTRACCIÓN DE PRODUCTOS ALTERNATIVOS (PUPPETEER) ===
    console.log(`   🤖 Extrayendo productos alternativos con Puppeteer...`);
    const productosAlternativos = await getDonaldsonAlternatives(url);
    
    // === DATOS CRUDOS DEL SCRAPER ===
    const rawData = {
      skuBuscado: code,
      idReal: code,
      descripcion,
      especificaciones: specs,
      alternativos,
      productosAlternativos,
      urlFinal: url,
      cantidadEspecificaciones: Object.keys(specs).length,
      cantidadAlternativos: alternativos.length,
      timestamp: new Date().toISOString(),
      v: "ENHANCED_v3.0"
    };
    
    // === MAPEO A COLUMNAS DEL SHEET ===
    console.log(`   🗺️  Mapeando especificaciones a columnas del sheet...`);
    const mappedData = donaldsonMapper.mapToSheet(rawData);
    
    // === GENERACIÓN DE SKU ELIMFILTERS ===
    console.log(`   🔢 Generando ELIMFILTERS SKU...`);
    const filterType = mappedData.filter_type.toUpperCase();
    const skuResult = skuGenerator.generate(code, filterType, 'PERFORMANCE');
    
    // Agregar SKU y prefix generados
    mappedData.elimfilters_sku = skuResult.sku;
    mappedData.prefix = skuResult.prefix;
    mappedData.tier_system = skuResult.variant;
    
    console.log(`   ✅ SKU generado: ${skuResult.sku}`);
    
    // === GENERAR VARIANTES TRILOGY ===
    console.log(`   🎯 Generando variantes TRILOGY...`);
    const trilogyVariants = [
      { ...mappedData, tier_system: 'STANDARD', elimfilters_sku: skuGenerator.generate(code, filterType, 'STANDARD').sku },
      { ...mappedData, tier_system: 'PERFORMANCE', elimfilters_sku: skuGenerator.generate(code, filterType, 'PERFORMANCE').sku },
      { ...mappedData, tier_system: 'ELITE', elimfilters_sku: skuGenerator.generate(code, filterType, 'ELITE').sku }
    ];
    
    // === RESULTADO FINAL ===
    return {
      success: true,
      source: 'donaldson_enhanced',
      productUrl: url,
      
      // Datos mapeados para el sheet
      sheetData: mappedData,
      
      // Variantes TRILOGY
      trilogyVariants: trilogyVariants,
      
      // Datos crudos (para debug)
      rawData: rawData,
      
      // Metadata
      metadata: {
        scraper_version: 'ENHANCED_v3.0',
        timestamp: new Date().toISOString(),
        specs_extracted: Object.keys(specs).length,
        alternates_found: alternativos.length,
        products_found: productosAlternativos.length,
        columns_mapped: Object.keys(mappedData).length
      }
    };
    
  } catch (error) {
    console.error("🔴 ERROR EN DONALDSON SCRAPER ENHANCED:", error.message);
    return {
      success: false,
      error: error.message,
      code: code,
      url: url
    };
  }
}

module.exports = scrapeDonaldsonEnhanced;
