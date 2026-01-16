const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeDonaldsonCrossRef(filterCode) {
  try {
    const searchUrl = `https://shop.donaldson.com/store/en-us/search?text=${filterCode}`;
    const response = await axios.get(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    const $ = cheerio.load(response.data);
    const productLink = $('a[href*="/product/"]').first().attr('href');
    
    if (!productLink) return null;
    
    const productUrl = `https://shop.donaldson.com${productLink}`;
    const productPage = await axios.get(productUrl);
    const $p = cheerio.load(productPage.data);
    
    const title = $p('h1').text().toLowerCase();
    const breadcrumb = $p('.breadcrumb').text().toLowerCase();
    
    let filterType = 'OIL';
    if (title.includes('fuel') || breadcrumb.includes('fuel') || title.includes('combustible')) filterType = 'FUEL';
    else if (title.includes('air') || breadcrumb.includes('air') || title.includes('aire')) filterType = 'AIR';
    else if (title.includes('hydraulic') || breadcrumb.includes('hydraulic')) filterType = 'HYDRAULIC';
    
    const productCode = productLink.match(/\/product\/([^\/]+)/)?.[1];
    
    return {
      idReal: productCode,
      filterType: filterType,
      source: 'donaldson'
    };
  } catch (error) {
    console.error('[Donaldson Scraper] Error:', error.message);
    return null;
  }
}

module.exports = scrapeDonaldsonCrossRef;
