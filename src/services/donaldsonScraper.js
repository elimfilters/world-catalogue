const puppeteer = require('puppeteer');

async function scrapeDonaldson(partNumber) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    const url = `https://www.donaldson.com/en-us/engine/search/?q=${partNumber}`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('.product-card, .search-result, .part-detail', { timeout: 10000 });
    const productData = await page.evaluate(() => {
      const data = { partNumber: '', description: '', specifications: {}, images: [], applications: [] };
      const partNumberEl = document.querySelector('[data-part-number], .part-number, h1');
      if (partNumberEl) data.partNumber = partNumberEl.textContent.trim();
      const descEl = document.querySelector('.product-description, .description, p');
      if (descEl) data.description = descEl.textContent.trim();
      const specRows = document.querySelectorAll('.specification-row, tr, .spec-item');
      specRows.forEach(row => {
        const label = row.querySelector('.spec-label, th, .label');
        const value = row.querySelector('.spec-value, td, .value');
        if (label && value) {
          const key = label.textContent.trim().replace(/:/g, '');
          data.specifications[key] = value.textContent.trim();
        }
      });
      const images = document.querySelectorAll('.product-image img, .gallery img');
      images.forEach(img => { if (img.src) data.images.push(img.src); });
      return data;
    });
    return { success: true, data: productData, url: url };
  } catch (error) {
    return { success: false, error: error.message };
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { scrapeDonaldson };
