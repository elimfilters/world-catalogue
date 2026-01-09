const axios = require('axios');
const cheerio = require('cheerio');

class DonaldsonCrossReferenceScraper {
  constructor() {
    this.baseUrl = 'https://shop.donaldson.com';
    this.searchUrl = '/store/es-us/search';
  }

  async scrapeProduct(oemCode) {
    try {
      console.log(`\n🎯 Iniciando scraping para: ${oemCode}`);
      
      const crossRef = await this.searchCrossReference(oemCode);
      
      if (!crossRef || !crossRef.productUrl) {
        console.log('📦 Cross-reference no encontrado, generando MOCK...');
        return this.getMockData(oemCode);
      }

      const details = await this.scrapeProductDetails(crossRef.productUrl);
      
      if (!details) {
        console.log('📦 Detalles no encontrados, generando MOCK...');
        return this.getMockData(oemCode);
      }

      const trilogy = this.generateTrilogy(crossRef.donaldsonCode, details);

      return {
        success: true,
        source: 'Donaldson_Real',
        input_code: oemCode,
        cross_reference: {
          oem_code: oemCode,
          donaldson_code: crossRef.donaldsonCode,
          search_url: crossRef.searchUrl,
          product_url: crossRef.productUrl
        },
        main_product: {
          code: crossRef.donaldsonCode,
          description: details.description || crossRef.description,
          specs: details.specs
        },
        alternatives: [],
        generated_skus: trilogy,
        total_products: trilogy.length
      };

    } catch (error) {
      console.error('❌ Error general:', error.message);
      return this.getMockData(oemCode);
    }
  }

  async searchCrossReference(oemCode) {
    try {
      console.log(`🔍 Buscando cross-reference: ${oemCode}`);
      
      const searchUrl = `${this.baseUrl}${this.searchUrl}?Ntt=${oemCode}*&Ntk=All&originalSearchTerm=${oemCode}*`;
      
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      
      let donaldsonCode = null;
      let productUrl = null;
      let description = null;

      $('a[href*="/product/"]').each((i, elem) => {
        const href = $(elem).attr('href');
        const match = href.match(/\/product\/([A-Z]+\d+)\/(\d+)/);
        
        if (match && !donaldsonCode) {
          donaldsonCode = match[1];
          productUrl = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
          description = $(elem).closest('div').find('p, .description').first().text().trim();
          
          console.log(`✅ ${oemCode} → ${donaldsonCode}`);
          console.log(`   URL: ${productUrl}`);
          return false;
        }
      });

      if (!donaldsonCode) {
        const bodyText = $('body').text();
        const codes = bodyText.match(/\b([PD][A-Z]{0,2}\d{5,7})\b/g);
        if (codes) donaldsonCode = codes[0];
      }

      if (!donaldsonCode) return null;

      return {
        oemCode,
        donaldsonCode,
        description: description || `FLEETGUARD ${oemCode}`,
        productUrl,
        searchUrl
      };

    } catch (error) {
      console.error(`❌ Error búsqueda: ${error.message}`);
      return null;
    }
  }

  async scrapeProductDetails(productUrl) {
    try {
      console.log(`📦 Scrapeando: ${productUrl}`);
      
      const response = await axios.get(productUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      
      const details = {
        title: $('h1').first().text().trim(),
        description: $('.product-description, p').first().text().trim() || $('h1').first().text().trim(),
        specs: {},
        images: []
      };

      $('table tr').each((i, elem) => {
        const cells = $(elem).find('td, th');
        if (cells.length >= 2) {
          const label = $(cells[0]).text().trim();
          const value = $(cells[1]).text().trim();
          if (label && value) details.specs[label] = value;
        }
      });

      $('img.product-image, .gallery img').each((i, elem) => {
        const src = $(elem).attr('src');
        if (src) details.images.push(src.startsWith('http') ? src : `${this.baseUrl}${src}`);
      });

      console.log(`✅ Specs: ${Object.keys(details.specs).length}`);
      return details;

    } catch (error) {
      console.error(`❌ Error detalles: ${error.message}`);
      return null;
    }
  }

  generateTrilogy(donaldsonCode, details) {
    const baseNum = donaldsonCode.replace(/\D/g, '').slice(-4).padStart(4, '0');
    
    return [
      {
        donaldson_code: donaldsonCode,
        elimfilters_sku: `EL8${baseNum}`,
        technology: 'DURAFLOW™',
        tier: 'STANDARD',
        description: details.title || `Filtro ${donaldsonCode}`,
        specs: details.specs
      },
      {
        donaldson_code: `${donaldsonCode}-PERF`,
        elimfilters_sku: `EL8${(parseInt(baseNum) + 1).toString().padStart(4, '0')}`,
        technology: 'SYNTRAX™',
        tier: 'PERFORMANCE',
        description: `Performance - ${donaldsonCode}`,
        specs: { ...details.specs, enhanced: true }
      },
      {
        donaldson_code: `DBL${baseNum}`,
        elimfilters_sku: `EL8${(parseInt(baseNum) + 2).toString().padStart(4, '0')}`,
        technology: 'NANOFORCE™',
        tier: 'ELITE',
        description: `Elite - ${donaldsonCode}`,
        specs: { ...details.specs, synthetic: true }
      }
    ];
  }

  getMockData(code) {
    const baseNum = code.replace(/\D/g, '').slice(-4).padStart(4, '0');
    
    return {
      success: true,
      source: 'Donaldson_MOCK',
      input_code: code,
      main_product: {
        code: code,
        description: `Filtro ${code}`,
        specs: { type: 'Lubricante' }
      },
      alternatives: [],
      generated_skus: [
        {
          donaldson_code: code,
          elimfilters_sku: `EL8${baseNum}`,
          technology: 'DURAFLOW™',
          tier: 'STANDARD',
          description: 'Standard Protection'
        },
        {
          donaldson_code: `${code}-PERF`,
          elimfilters_sku: `EL8${(parseInt(baseNum) + 1).toString().padStart(4, '0')}`,
          technology: 'SYNTRAX™',
          tier: 'PERFORMANCE',
          description: 'Performance Blend'
        },
        {
          donaldson_code: `DBL${baseNum}`,
          elimfilters_sku: `EL8${(parseInt(baseNum) + 2).toString().padStart(4, '0')}`,
          technology: 'NANOFORCE™',
          tier: 'ELITE',
          description: 'Synthetic Elite'
        }
      ],
      total_products: 3
    };
  }
}

module.exports = new DonaldsonCrossReferenceScraper();
