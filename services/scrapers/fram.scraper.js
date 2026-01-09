const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeFRAM(code) {
  try {
    // Determinar tipo de filtro
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
    console.log(`🔍 FRAM: ${productUrl}`);
    
    // Fetch HTML directamente
    const response = await axios.get(productUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    
    // Extraer título
    const title = $('h1, .page-title').first().text().trim();
    console.log(`📄 Título: ${title}`);
    
    // Detectar tipo
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
    
    // Extraer TODO el contenido de tabs (está en el HTML aunque oculto)
    const description = [];
    const applications = [];
    const crossReferences = [];
    
    // DESCRIPTION - Buscar en divs de contenido
    $('[data-role="content"], .product-description, .description').each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 50 && !text.includes('Please wait')) {
        const cleaned = text.replace(/\s+/g, ' ').substring(0, 500);
        if (!description.includes(cleaned)) {
          description.push(cleaned);
        }
      }
    });
    
    // APPLICATIONS - Buscar tablas y listas de vehículos
    $('table tr, .vehicle-list li, [class*="application"] tr').each((i, el) => {
      const text = $(el).text().trim().replace(/\s+/g, ' ');
      // Detectar formato de vehículo (año marca modelo)
      if (text.match(/\d{4}/) && text.length > 15 && text.length < 200) {
        if (!text.toLowerCase().includes('year') && 
            !text.toLowerCase().includes('make') &&
            !applications.includes(text)) {
          applications.push(text);
        }
      }
    });
    
    // COMPARISON - Buscar códigos de competencia
    $('table td, .comparison td, [class*="cross"] td').each((i, el) => {
      const codes = $(el).text().match(/\b[A-Z0-9-]{3,12}\b/g);
      if (codes) {
        codes.forEach(code => {
          if (code.length >= 3 && 
              code.length <= 12 && 
              !crossReferences.includes(code) &&
              code !== codeUpper) {
            crossReferences.push(code);
          }
        });
      }
    });
    
    console.log(`✅ Extraído: ${applications.length} apps, ${crossReferences.length} cross-refs`);
    
    return {
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
    
  } catch (error) {
    console.error('❌ FRAM Error:', error.message);
    return {
      success: false,
      error: error.message,
      searched: code
    };
  }
}

module.exports = { scrapeFRAM };