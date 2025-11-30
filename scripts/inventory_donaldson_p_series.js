// Inventory script: sweep Donaldson P-series subseries and infer families
// Usage: node scripts/inventory_donaldson_p_series.js

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Candidate P subseries to scan (expandable)
const CANDIDATE_SUBSERIES = [
  // Confirmados previamente
  'P50','P52','P53','P54','P55','P56','P60','P62','P77','P78','P15','P17','P18',
  // Exploratorios
  'P57','P58','P59','P61','P63','P64','P65','P66','P67','P68','P69','P70','P71','P72','P73','P74','P75','P76','P79',
  'P10','P11','P12','P13','P14','P16','P19'
];

const FAMILY_KEYWORDS = [
  { family: 'AIRE', patterns: [/air\s*filter/i, /radialseal/i, /primary\s*air/i, /outer\s*air/i, /inner\s*air/i] },
  { family: 'OIL', patterns: [/lube\s*filter/i, /oil\s*filter/i, /spin-?on\s*full\s*flow/i] },
  { family: 'FUEL', patterns: [/fuel\s*filter/i, /water\s*separator/i, /diesel\s*filter/i] },
  { family: 'COOLANT', patterns: [/coolant\s*filter/i] },
  { family: 'HIDRAULIC', patterns: [/hydraulic\s*filter/i, /low\s*pressure\s*filters/i] }
];

async function fetchDonaldsonSearch(q) {
  const url = `https://shop.donaldson.com/store/en-us/search/?q=${encodeURIComponent(q)}`;
  try {
    const res = await axios.get(url, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    return String(res.data || '');
  } catch (e) {
    return '';
  }
}

function inferFamilyFromHtml(html) {
  const lower = html.toLowerCase();
  // Try patterns in priority order
  for (const group of FAMILY_KEYWORDS) {
    let matched = false;
    for (const rx of group.patterns) {
      if (rx.test(lower)) { matched = true; break; }
    }
    if (matched) return group.family;
  }
  return null;
}

async function run() {
  const results = [];
  for (const prefix of CANDIDATE_SUBSERIES) {
    // Query using prefix and a wildcard-like hint: include digits to narrow results
    const q = `${prefix}`;
    const html = await fetchDonaldsonSearch(q);
    const family = inferFamilyFromHtml(html);
    // Extract sample codes appearing in the page (rough heuristic)
    const codeMatches = Array.from(new Set((html.match(/P\d{6,7}/gi) || []).filter(c => c.startsWith(prefix)))).slice(0, 10);
    results.push({ prefix, family_hint: family, examples: codeMatches });
    console.log(`• ${prefix} → ${family || 'unknown'} (${codeMatches.length} ejemplos)`);
    // Be polite with remote server
    await new Promise(r => setTimeout(r, 400));
  }
  const outDir = path.join(__dirname, '..', 'reports');
  const ts = new Date().toISOString().replace(/[:.]/g, '').replace('T','_').slice(0,15);
  const outFile = path.join(outDir, `inventory_donaldson_p_series_${ts}.json`);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify({ generated_at: new Date().toISOString(), results }, null, 2), 'utf8');
  console.log(`✔ Reporte guardado en: ${outFile}`);
}

run();