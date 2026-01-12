const axios = require('axios');
const cheerio = require('cheerio');

class DonaldsonKitScraper {
  async scrapeKitFromProduct(donaldsonCode) {
    try {
      console.log('[KitScraper] Checking for kit in product:', donaldsonCode);
      
      const url = `https://shop.donaldson.com/store/en-us/product/${donaldsonCode}`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });
      
      const $ = cheerio.load(response.data);
      
      // Buscar en sección "Product Variants" o "Variantes de pièces"
      const kitLinks = [];
      $('a[href*="/product/"]').each((i, elem) => {
        const text = $(elem).text().toLowerCase();
        const href = $(elem).attr('href');
        
        if ((text.includes('kit') || text.includes('juego')) && href) {
          const match = href.match(/\/product\/([A-Z0-9]+)/);
          if (match) {
            kitLinks.push(match[1]);
          }
        }
      });
      
      if (kitLinks.length === 0) {
        console.log('[KitScraper] No kit found for:', donaldsonCode);
        return null;
      }
      
      console.log('[KitScraper] Found kit(s):', kitLinks);
      return kitLinks[0]; // Retornar primer kit encontrado
      
    } catch (error) {
      console.error('[KitScraper] Error scraping product:', error.message);
      return null;
    }
  }

  async scrapeKitDetails(kitCode) {
    try {
      console.log('[KitScraper] Scraping kit details:', kitCode);
      
      const url = `https://shop.donaldson.com/store/en-us/product/${kitCode}`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });
      
      const $ = cheerio.load(response.data);
      
      // Extraer descripción del kit
      const description = $('h1, .product-title').first().text().trim() || `${kitCode} Kit`;
      
      // Extraer filtros incluidos (esto depende de la estructura de la página)
      const filtersIncluded = [];
      
      // Buscar en tablas o listas de componentes
      $('table tr, ul li').each((i, elem) => {
        const text = $(elem).text();
        const match = text.match(/(P[0-9]{6})[^\d]*(\d+)/);
        if (match) {
          filtersIncluded.push({
            code: match[1],
            qty: parseInt(match[2]) || 1
          });
        }
      });
      
      return {
        kitCode,
        description,
        filtersIncluded,
        url
      };
      
    } catch (error) {
      console.error('[KitScraper] Error scraping kit details:', error.message);
      return null;
    }
  }

  generateEK5SKU(donaldsonKitCode) {
    const last4 = donaldsonKitCode.replace(/[^0-9]/g, '').slice(-4);
    return 'EK5' + last4;
  }
}

module.exports = new DonaldsonKitScraper();
