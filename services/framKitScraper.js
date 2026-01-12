const axios = require('axios');
const cheerio = require('cheerio');

class FramKitScraper {
  async scrapeKitFromProduct(framCode) {
    try {
      console.log('[FramKitScraper] Checking for kit in product:', framCode);
      
      const url = `https://www.fram.com/products/${framCode}`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });
      
      const $ = cheerio.load(response.data);
      
      // Buscar kits relacionados
      const kitLinks = [];
      $('a[href*="/products/"]').each((i, elem) => {
        const text = $(elem).text().toLowerCase();
        const href = $(elem).attr('href');
        
        if ((text.includes('kit') || text.includes('service')) && href) {
          const match = href.match(/\/products\/([A-Z0-9\-]+)/);
          if (match) {
            kitLinks.push(match[1]);
          }
        }
      });
      
      if (kitLinks.length === 0) {
        console.log('[FramKitScraper] No kit found for:', framCode);
        return null;
      }
      
      console.log('[FramKitScraper] Found kit(s):', kitLinks);
      return kitLinks[0];
      
    } catch (error) {
      console.error('[FramKitScraper] Error scraping product:', error.message);
      return null;
    }
  }

  async scrapeKitDetails(kitCode) {
    try {
      console.log('[FramKitScraper] Scraping kit details:', kitCode);
      
      const url = `https://www.fram.com/products/${kitCode}`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });
      
      const $ = cheerio.load(response.data);
      
      const description = $('h1, .product-title').first().text().trim() || `${kitCode} Service Kit`;
      
      const filtersIncluded = [];
      
      $('table tr, ul li, .kit-contents').each((i, elem) => {
        const text = $(elem).text();
        const match = text.match(/(CA|PH|XG|CH|FT)[0-9A-Z]+[^\d]*(\d+)/);
        if (match) {
          filtersIncluded.push({
            code: match[1] + match[0].match(/[0-9A-Z]+/)[0],
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
      console.error('[FramKitScraper] Error scraping kit details:', error.message);
      return null;
    }
  }

  generateEK3SKU(framKitCode) {
    const last4 = framKitCode.replace(/[^0-9]/g, '').slice(-4).padStart(4, '0');
    return 'EK3' + last4;
  }
}

module.exports = new FramKitScraper();
