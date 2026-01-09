const axios = require('axios');
const cheerio = require('cheerio');
const framMapper = require('../mappers/fram.mapper');
const skuGenerator = require('../sku.generator');

/**
 * FRAM SCRAPER ENHANCED
 * Versión mejorada que mapea datos a las columnas del MASTER_UNIFIED_V5
 */
async function scrapeFRAMEnhanced(code) {
  try {
    console.log(`🔍 Scraping FRAM: ${code}`);
    
    // === DETERMINAR TIPO Y URL ===
    let filterSeries = 'extra-guard';
    let filterCategory = 'oil-filter-spin-on';
    
    const codeUpper = code.toUpperCase();
    if (codeUpper.match(/^PH/)) filterCategory = 'oil-filter-spin-on';
    else if (codeUpper.match(/^CA/)) filterCategory = 'air-filter';
    else if (codeUpper.match(/^G\d/)) filterCategory = 'fuel-filter';
    else if (codeUpper.match(/^CF/)) {
      filterCategory = 'cabin-air-filter';
      filterSeries = 'fresh-breeze';
    }
    
    const productUrl = `https://www.fram.com/fram-${filterSeries}-${filterCategory}-${code.toLowerCase()}`;
    console.log(`   📍 URL: ${productUrl}`);
    
    // === FETCH HTML ===
    const response = await axios.get(productUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    
    // === EXTRACCIÓN DE TÍTULO ===
    const title = $('h1, .page-title').first().text().trim();
    console.log(`   📄 Título: ${title}`);
    
    // === DETECTAR TIPO DE FILTRO ===
    let filterType = '';
    if (title.toLowerCase().includes('oil')) filterType = 'Lube';
    else if (title.toLowerCase().includes('air') && !title.toLowerCase().includes('cabin')) filterType = 'Air';
    else if (title.toLowerCase().includes('fuel')) filterType = 'Fuel';
    else if (title.toLowerCase().includes('cabin')) filterType = 'Cabin';
    
    if (!filterType) {
      if (codeUpper.match(/^PH/i)) filterType = 'Lube';
      else if (codeUpper.match(/^CA/i)) filterType = 'Air';
      else if (codeUpper.match(/^G/i)) filterType = 'Fuel';
      else if (codeUpper.match(/^CF/i)) filterType = 'Cabin';
    }
    
    // === EXTRACCIÓN DE DESCRIPCIÓN ===
    const description = [];
    $('[data-role="content"], .product-description, .description').each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 50 && !text.includes('Please wait')) {
        const cleaned = text.replace(/\s+/g, ' ').substring(0, 500);
        if (!description.includes(cleaned)) {
          description.push(cleaned);
        }
      }
    });
    
    // === EXTRACCIÓN DE APLICACIONES ===
    const applications = [];
    $('table tr, .vehicle-list li, [class*="application"] tr').each((i, el) => {
      const text = $(el).text().trim().replace(/\s+/g, ' ');
      if (text.match(/\d{4}/) && text.length > 15 && text.length < 200) {
        if (!text.toLowerCase().includes('year') &&
            !text.toLowerCase().includes('make') &&
            !applications.includes(text)) {
          applications.push(text);
        }
      }
    });
    
    // === EXTRACCIÓN DE CROSS REFERENCES ===
    const crossReferences = [];
    $('table td, .comparison td, [class*="cross"] td').each((i, el) => {
      const codes = $(el).text().match(/\b[A-Z0-9-]{3,12}\b/g);
      if (codes) {
        codes.forEach(c => {
          if (c.length >= 3 &&
              c.length <= 12 &&
              !crossReferences.includes(c) &&
              c !== codeUpper) {
            crossReferences.push(c);
          }
        });
      }
    });
    
    console.log(`   ✅ Extraído: ${applications.length} apps, ${crossReferences.length} cross-refs`);
    
    // === DATOS CRUDOS ===
    const rawData = {
      success: true,
      data: {
        searchedCode: codeUpper,
        framCode: codeUpper,
        isDirect: true,
        filterType: filterType,
        description: title,
        fullDescription: description.join('\n\n'),
        applications: applications.slice(0, 100),
        crossReferences: crossReferences.slice(0, 100)
      },
      productUrl: productUrl
    };
    
    // === MAPEO A COLUMNAS DEL SHEET ===
    console.log(`   🗺️  Mapeando datos a columnas del sheet...`);
    const mappedData = framMapper.mapToSheet(rawData);
    
    // === GENERACIÓN DE SKU ELIMFILTERS ===
    console.log(`   🔢 Generando ELIMFILTERS SKU...`);
    const filterTypeUpper = filterType.toUpperCase();
    const skuResult = skuGenerator.generate(code, filterTypeUpper, 'PERFORMANCE');
    
    // Agregar SKU y prefix generados
    mappedData.elimfilters_sku = skuResult.sku;
    mappedData.prefix = skuResult.prefix;
    mappedData.tier_system = skuResult.variant;
    
    console.log(`   ✅ SKU generado: ${skuResult.sku}`);
    
    // === GENERAR VARIANTES TRILOGY ===
    console.log(`   🎯 Generando variantes TRILOGY...`);
    const trilogyVariants = [
      { ...mappedData, tier_system: 'STANDARD', elimfilters_sku: skuGenerator.generate(code, filterTypeUpper, 'STANDARD').sku },
      { ...mappedData, tier_system: 'PERFORMANCE', elimfilters_sku: skuGenerator.generate(code, filterTypeUpper, 'PERFORMANCE').sku },
      { ...mappedData, tier_system: 'ELITE', elimfilters_sku: skuGenerator.generate(code, filterTypeUpper, 'ELITE').sku }
    ];
    
    // === RESULTADO FINAL ===
    return {
      success: true,
      source: 'fram_enhanced',
      productUrl: productUrl,
      
      // Datos mapeados para el sheet
      sheetData: mappedData,
      
      // Variantes TRILOGY
      trilogyVariants: trilogyVariants,
      
      // Datos crudos (para debug)
      rawData: rawData.data,
      
      // Metadata
      metadata: {
        scraper_version: 'ENHANCED_v3.0',
        timestamp: new Date().toISOString(),
        applications_found: applications.length,
        cross_refs_found: crossReferences.length,
        columns_mapped: Object.keys(mappedData).length
      }
    };
    
  } catch (error) {
    console.error('❌ FRAM Enhanced Error:', error.message);
    return {
      success: false,
      error: error.message,
      searched: code
    };
  }
}

module.exports = scrapeFRAMEnhanced;
