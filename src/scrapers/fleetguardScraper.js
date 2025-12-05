'use strict';
try { require('dotenv').config(); } catch (_) {}

// Attempt Playwright first; fallback to Puppeteer already in deps
// Default for Fleetguard: non-headless (visible) unless HEADLESS explicitly = 'true'
async function launchBrowser() {
  const headlessEnv = process.env.HEADLESS;
  const headlessDefault = false; // prefer visible for Fleetguard pages
  const headlessFlag = headlessEnv === 'true' ? true : headlessDefault;
  try {
    const { chromium } = require('playwright');
    const browser = await chromium.launch({ headless: headlessFlag });
    return { browser, isPlaywright: true };
  } catch (_) {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({ headless: headlessFlag ? 'new' : false });
    return { browser, isPlaywright: false };
  }
}

function mmFromText(value) {
  if (!value) return null;
  const s = String(value).trim();
  const num = parseFloat((s.match(/[0-9]+(?:\.[0-9]+)?/) || [null])[0]);
  if (num == null || isNaN(num)) return null;
  if (/\b(in|inch|inches)\b/i.test(s)) return +(num * 25.4).toFixed(2);
  return +num.toFixed(2);
}

function psiFromText(value) {
  if (!value) return null;
  const s = String(value).trim();
  const num = parseFloat((s.match(/[0-9]+(?:\.[0-9]+)?/) || [null])[0]);
  if (num == null || isNaN(num)) return null;
  return +num.toFixed(2);
}

function gpmFromText(value) {
  if (!value) return null;
  const s = String(value).trim();
  const num = parseFloat((s.match(/[0-9]+(?:\.[0-9]+)?/) || [null])[0]);
  if (num == null || isNaN(num)) return null;
  // Detect liters per minute and convert to GPM
  if (/l\s*\/\s*m(in)?/i.test(s)) {
    return +(num * 0.264172).toFixed(2);
  }
  return +num.toFixed(2);
}

function normalizeLabel(txt) {
  const t = String(txt || '').toLowerCase();
  if (t.includes('overall height') || t.includes('height')) return 'height_mm';
  if (t.includes('outer diameter')) return 'outer_diameter_mm';
  if (t.includes('inner diameter')) return 'inner_diameter_mm';
  if (t.includes('gasket od')) return 'gasket_od_mm';
  if (t.includes('gasket id')) return 'gasket_id_mm';
  if (t.includes('thread') || t.includes('thread size')) return 'thread_size';
  return null;
}

async function scrapeFleetguardBySearch(code, options = {}) {
  const { browser, isPlaywright } = await launchBrowser();
  let page;
  try {
    if (isPlaywright) {
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        locale: 'en-US',
        viewport: { width: 1360, height: 900 },
      });
      page = await context.newPage();
      const cookieHeader = process.env.FLEETGUARD_COOKIE;
      if (cookieHeader) {
        const pairs = cookieHeader.split(';').map(s => s.trim()).filter(Boolean);
        const cookies = [];
        for (const p of pairs) {
          const eqIdx = p.indexOf('=');
          if (eqIdx > 0) {
            const name = p.slice(0, eqIdx).trim();
            const value = p.slice(eqIdx + 1).trim();
            cookies.push({ name, value, domain: 'www.fleetguard.com', path: '/' });
          }
        }
        if (cookies.length) {
          await context.addCookies(cookies);
        }
      }
    } else {
      page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');
      const cookieHeader = process.env.FLEETGUARD_COOKIE;
      if (cookieHeader) {
        const pairs = cookieHeader.split(';').map(s => s.trim()).filter(Boolean);
        for (const p of pairs) {
          const eqIdx = p.indexOf('=');
          if (eqIdx > 0) {
            const name = p.slice(0, eqIdx).trim();
            const value = p.slice(eqIdx + 1).trim();
            await page.setCookie({ name, value, domain: 'www.fleetguard.com', path: '/' });
          }
        }
      }
    }
    // Try direct productDetails first with queryTerm/propertyVal variations
    const urls = [];
    if (options.fleetguardSku) {
      urls.push(`https://www.fleetguard.com/s/productDetails?language=en_US&propertyVal=${encodeURIComponent(options.fleetguardSku)}&queryTerm=${encodeURIComponent(code)}&hybridSearch=false`);
    }
    urls.push(`https://www.fleetguard.com/s/productDetails?language=en_US&queryTerm=${encodeURIComponent(code)}&hybridSearch=false`);
    urls.push(`https://www.fleetguard.com/s/productDetails?language=en_US&propertyVal=${encodeURIComponent(code)}&hybridSearch=false`);
    // Fallback search results
    const searchUrl = `https://www.fleetguard.com/searchResult?propertyVal=${encodeURIComponent(code)}&hybrid=searchIsFalse&language=en-US`;
    urls.push(searchUrl);
    let productUrl = null;
    for (const u of urls) {
      try {
        await page.goto(u, { waitUntil: isPlaywright ? 'networkidle' : 'networkidle0' });
        // Gentle scroll to trigger lazy-loaded blocks
        await page.evaluate(() => new Promise(resolve => {
          let y = 0; const step = 400; const max = document.body.scrollHeight;
          const timer = setInterval(() => { window.scrollTo(0, y += step); if (y >= max) { clearInterval(timer); resolve(true); } }, 120);
        }));
        // Wait specifically for Specification header or the Download Specs link
        try {
          if (isPlaywright) {
            await page.waitForSelector('text=Specification', { timeout: 6000 });
          } else {
            await page.waitForFunction(() => {
              return Array.from(document.querySelectorAll('*')).some(el => /Specification/i.test(el.textContent || ''));
            }, { timeout: 6000 });
          }
        } catch (_) {}
        // If page has visible "Specification" section or any table rows, keep it
        const hasSpecs = await page.evaluate(() => {
          const specText = Array.from(document.querySelectorAll('*')).some(el => /Specification/i.test(el.textContent || ''));
          const hasRows = document.querySelectorAll('tr').length > 4;
          return specText || hasRows;
        });
        if (hasSpecs) { productUrl = u; break; }
      } catch (_) {}
    }

    // If not found yet, try to locate first product link from search results
    if (!productUrl || productUrl === searchUrl) {
      const anchors = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a'))
          .map(a => ({ href: a.href, text: a.textContent.trim() }));
      });
      const candidate = anchors.find(a => /ccrz__ProductDetails/i.test(a.href) || /\/product\//i.test(a.href) || /\/s\/product/i.test(a.href));
      if (candidate) {
        productUrl = candidate.href;
      } else {
        productUrl = searchUrl;
      }
    }

    if (productUrl !== searchUrl) {
      await page.goto(productUrl, { waitUntil: isPlaywright ? 'networkidle' : 'networkidle0' });
      // Ensure spec content is present
      try {
        if (isPlaywright) {
          await page.waitForSelector('text=Specification', { timeout: 8000 });
        } else {
          await page.waitForFunction(() => Array.from(document.querySelectorAll('*')).some(el => /Specification/i.test(el.textContent || '')), { timeout: 8000 });
        }
      } catch (_) {}
    }

    const result = await page.evaluate(() => {
      function textOf(el) {
        return (el && (el.textContent || '').trim()) || '';
      }

      const technical = {};

      // Locate container near the 'Specification' heading
      let specContainer = null;
      const headers = Array.from(document.querySelectorAll('h1,h2,h3,h4,strong,span,p'))
        .filter(el => /Specification/i.test(el.textContent || ''));
      if (headers.length) {
        const h = headers[0];
        // search siblings and parents for a dense container
        const candidates = [h.parentElement, h.nextElementSibling, h.closest('section'), h.closest('div'), document.querySelector('.ccrz__ProductDetails')]
          .filter(Boolean);
        for (const c of candidates) {
          const rows = c.querySelectorAll('tr, dt, .row, .grid, .columns, .col, .slds-grid');
          if (rows && rows.length > 6) { specContainer = c; break; }
        }
      }
      const containers = specContainer ? [specContainer] : [
        ...document.querySelectorAll('table, dl, .specs, .product-specs, .attributes, .details, .ccrz__ProductDetails')
      ];

      containers.forEach(c => {
        // Table rows
        c.querySelectorAll('tr').forEach(tr => {
          const th = tr.querySelector('th, td:first-child');
          const td = tr.querySelector('td:last-child');
          const label = textOf(th);
          const value = textOf(td);
          if (label && value) {
            const key = label.toLowerCase();
            window.__specs = window.__specs || [];
            window.__specs.push([label, value]);
          }
        });
        // Definition lists
        c.querySelectorAll('dt').forEach(dt => {
          const dd = dt.nextElementSibling;
          const label = textOf(dt);
          const value = textOf(dd);
          if (label && value) {
            window.__specs = window.__specs || [];
            window.__specs.push([label, value]);
          }
        });
        // Generic two-column grids (.row > .col-*)
        const rows = c.querySelectorAll('.row, .slds-grid');
        rows.forEach(r => {
          const cols = r.querySelectorAll('.col, [class*="col-"], .slds-col');
          if (cols.length >= 2) {
            const label = textOf(cols[0]);
            const value = textOf(cols[1]);
            if (label && value) {
              window.__specs = window.__specs || [];
              window.__specs.push([label, value]);
            }
          }
        });
      });

      // Fallback: capture pairs immediately after the 'Specification' heading
      if (!window.__specs || window.__specs.length === 0) {
        const allWithNodes = Array.from(document.querySelectorAll('body *'))
          .map(el => ({ el, txt: (el.textContent || '').trim() }))
          .filter(x => x.txt);
        const specIdx = allWithNodes.findIndex(x => /Specification/i.test(x.txt));
        const slice = specIdx >= 0 ? allWithNodes.slice(specIdx + 1, specIdx + 120) : allWithNodes.slice(0, 120);
        const unitOrTest = (v) => /inch|mm|psi|l\s*\/\s*m(in)?|micron|iso/i.test(v || '');
        window.__specs = [];
        for (let i = 0; i < slice.length - 1; i++) {
          const aRaw = slice[i].txt;
          const bRaw = slice[i + 1].txt;
          const a = aRaw.toLowerCase();
          if (
            a.includes('height') ||
            a.includes('length') ||
            a.includes('outer diameter') ||
            a.includes('largest od') ||
            a.includes('inner diameter') ||
            a.includes('gasket inside diameter') ||
            a.includes('gasket od') ||
            a.includes('thread size') ||
            a.includes('rated flow') ||
            a.includes('hydrostatic burst') ||
            a.includes('efficiency test std') ||
            a.includes('test specification') ||
            a.includes('primary particle efficiency') ||
            a.includes('pressure valve') ||
            unitOrTest(bRaw)
          ) {
            window.__specs.push([aRaw, bRaw]);
          }
        }
      }

      const tech = {};
      (window.__specs || []).forEach(([label, value]) => {
        const l = (label || '').toLowerCase();
        if (l.includes('height') || l.includes('length')) tech.length = value;
        if (l.includes('outer diameter') || l.includes('largest od')) tech.outer = value;
        if (l.includes('inner diameter') || l.includes('gasket inside diameter')) tech.inner = value;
        if (l.includes('thread')) tech.thread = value;
        if (l.includes('gasket od')) tech.gasket_od = value;
        if (l.includes('gasket id') || l.includes('gasket inside diameter')) tech.gasket_id = value;
        if (l.includes('rated flow')) tech.rated_flow = value;
        if (l.includes('hydrostatic burst')) tech.hydro_burst = value;
        if (l.includes('efficiency test std') || l.includes('test specification')) tech.iso = value;
        if (l.includes('primary particle efficiency')) tech.primary_eff = value;
        if (l.includes('pressure valve')) tech.pressure_valve = value;
      });

      // Cross/OEM references often appear across dynamic blocks; broaden patterns
      const crossTexts = Array.from(document.querySelectorAll('*, a'))
        .map(el => (el.textContent || '').trim())
        .filter(Boolean);
      const crossSet = new Set();
      const inputNorm = String((window.__inputCode || '')).toUpperCase().replace(/[^A-Z0-9\-]/g, '');

      // Helper to add code safely
      function addCode(code) {
        const c = String(code || '').toUpperCase();
        if (!c) return;
        if (c === inputNorm) return; // skip self code (e.g., AF25139)
        // Skip obvious non-codes: decimal numbers, units
        if (/\d+\.\d+/.test(c)) return;
        if (/(MM|IN|PSI|GPM)\b/.test(c)) return;
        crossSet.add(c);
      }

      // Patterns for common brands and OEM styles
      const patterns = [
        /\b(?:[A-Z]{1,4}\d{3,7}[A-Z]?)\b/g,                                   // P527682, AF25139, RS3518, CA7140
        /\b(?:[A-Z0-9]{1,5}(?:-[A-Z0-9]{2,8})+)\b/g,                           // F1HZ-9601-A, 1R-0750, 28113-2S000
        /\b(?:\d+[A-Z]-\d{3,6})\b/g,                                          // 1R-0750 (redundant with above but safer)
        /\b(?:PH|TG|XG|HM|CA|CF|CH|G|PS)\d{3,7}[A-Z]?\b/g,                     // FRAM families
      ];

      crossTexts.forEach(t => {
        for (const rx of patterns) {
          const m = t.match(rx);
          if (m) m.forEach(addCode);
        }
      });

      const cross = Array.from(crossSet);

      return { tech, cross };
    });

    const mapped = {
      technical: {
        height_mm: mmFromText(result.tech?.length || result.tech?.height),
        outer_diameter_mm: mmFromText(result.tech?.outer),
        inner_diameter_mm: mmFromText(result.tech?.inner),
        gasket_od_mm: mmFromText(result.tech?.gasket_od),
        gasket_id_mm: mmFromText(result.tech?.gasket_id || result.tech?.inner),
        thread_size: result.tech?.thread || null,
        rated_flow_gpm: gpmFromText(result.tech?.rated_flow),
        hydrostatic_burst_psi: psiFromText(result.tech?.hydro_burst),
        iso_test_method: result.tech?.iso || null,
        micron_rating: (function () {
          const s = String(result.tech?.primary_eff || '').toLowerCase();
          const m = s.match(/([0-9]+(?:\.[0-9]+)?)\s*micron/);
          return m ? parseFloat(m[1]) : null;
        })(),
      },
      crossCodes: (result.cross || []).filter(Boolean),
    };

    return mapped;
  } finally {
    if (page) {
      try { await page.close(); } catch (_) {}
    }
    if (browser) {
      try { await browser.close(); } catch (_) {}
    }
  }
}

module.exports = {
  scrapeFleetguardBySearch,
};
