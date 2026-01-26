const cheerio = require('cheerio');

function takeFirstN(arr, n = 10) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x) => (typeof x === 'string' ? x.trim() : String(x)))
    .filter((x) => x && x.length > 0)
    .slice(0, n);
}

function uniqueClean(arr) {
  if (!Array.isArray(arr)) return [];
  const seen = new Set();
  const out = [];
  for (const x of arr) {
    const v = (typeof x === 'string' ? x.trim() : String(x)).toUpperCase();
    if (!v) continue;
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

function extractListByHeading($, headingText) {
  const results = [];
  $('*').each((_, el) => {
    const text = $(el).text().trim();
    if (!text) return;
    if (text.toLowerCase().includes(headingText.toLowerCase())) {
      // Try to collect following list items or sibling paragraphs/links
      const container = $(el).next();
      if (container && container.length) {
        container.find('li, a, p, span').each((__, node) => {
          const t = $(node).text().trim();
          if (t) results.push(t);
        });
      }
    }
  });
  return uniqueClean(results);
}

function extractSpecsByTable($) {
  const specs = {};
  $('table').each((_, table) => {
    const headers = [];
    $(table)
      .find('tr')
      .each((__, tr) => {
        const cells = $(tr).find('th, td');
        if (cells.length === 2) {
          const k = $(cells[0]).text().trim();
          const v = $(cells[1]).text().trim();
          if (k && v) specs[k] = v;
        } else if (cells.length > 2) {
          const k = $(cells[0]).text().trim();
          const v = $(cells[1]).text().trim();
          if (k && v) specs[k] = v;
        }
      });
  });
  return specs;
}

function loadCheerio(html) {
  try {
    return cheerio.load(html || '');
  } catch (e) {
    return cheerio.load('');
  }
}

module.exports = {
  takeFirstN,
  uniqueClean,
  extractListByHeading,
  extractSpecsByTable,
  loadCheerio,
};