const puppeteer = require('puppeteer');
const { loadCheerio, takeFirstN, uniqueClean, extractListByHeading, extractSpecsByTable } = require('./utils');

async function findProductUrlFram(page, query) {
  const candidates = [
    `https://www.fram.com/search/?q=${encodeURIComponent(query)}`,
    `https://www.fram.com/products/`,
  ];
  for (const url of candidates) {
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
      const html = await page.content();
      const $ = loadCheerio(html);
      const links = [];
      $('a').each((_, a) => {
        const href = $(a).attr('href') || '';
        const text = $(a).text().trim();
        if (!href) return;
        if (text.toUpperCase().includes(query.toUpperCase())) links.push(href);
        if (/\/products\//i.test(href)) links.push(href);
      });
      const first = links.find((l) => l.includes('/products/')) || links[0];
      if (first) {
        const absolute = first.startsWith('http') ? first : new URL(first, url).toString();
        return absolute;
      }
    } catch (e) {
      // continuar
    }
  }
  return null;
}

async function scrapeProductFram(page, productUrl) {
  await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 45000 });
  const html = await page.content();
  const $ = loadCheerio(html);

  const titleText = ($('h1').first().text() || '').trim();
  const codeMatch = (titleText.match(/[A-Z]{1,3}\d{1,6}[A-Z]?/i) || [])[0] || titleText;

  const crossReferences = extractListByHeading($, 'Cross Reference');
  const oemCodes = uniqueClean([
    ...extractListByHeading($, 'OEM'),
    ...extractListByHeading($, 'Original Equipment'),
  ]);
  const engineApplications = extractListByHeading($, 'Engine');
  const equipmentApplications = extractListByHeading($, 'Vehicle');
  const specs = extractSpecsByTable($);

  return {
    brand: 'FRAM',
    partNumber: (codeMatch || '').toUpperCase(),
    productUrl,
    crossReferences: takeFirstN(crossReferences, 10),
    oemCodes: takeFirstN(oemCodes, 10),
    engineApplications: takeFirstN(engineApplications, 10),
    equipmentApplications: takeFirstN(equipmentApplications, 10),
    specs,
  };
}

async function scrapeFram(query) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    );

    const productUrl = await findProductUrlFram(page, query);
    if (!productUrl) {
      return {
        brand: 'FRAM',
        partNumber: (query || '').toUpperCase(),
        productUrl: null,
        crossReferences: [],
        oemCodes: [],
        engineApplications: [],
        equipmentApplications: [],
        specs: {},
      };
    }

    const details = await scrapeProductFram(page, productUrl);
    return details;
  } catch (e) {
    return {
      brand: 'FRAM',
      partNumber: (query || '').toUpperCase(),
      productUrl: null,
      crossReferences: [],
      oemCodes: [],
      engineApplications: [],
      equipmentApplications: [],
      specs: {},
      error: e && e.message ? e.message : String(e),
    };
  } finally {
    if (browser) {
      try { await browser.close(); } catch (_) {}
    }
  }
}

module.exports = { scrapeFram };