#!/usr/bin/env node
// Muestra el desglose de conteos por fuente (dominio) para un código OEM en Marinos
const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); } catch (_) {}

const { scraperBridge } = require('../src/scrapers/scraperBridge');
const { extractParkerSpecs, extractMercurySpecs, extractSierraSpecs } = require('../src/services/technicalSpecsScraper');

async function getCounts(code) {
  const up = String(code || '').toUpperCase().trim();
  let classification;
  try { classification = await scraperBridge(up, 'MARINE'); } catch (_) {}
  if (!classification || !classification.valid) {
    return { sku: up, source: null, source_counts: null, error: 'no_valid_source' };
  }
  const src = String(classification.source || '').toUpperCase();
  let specs;
  try {
    if (src === 'PARKER') specs = await extractParkerSpecs(up);
    else if (src === 'MERCRUISER') specs = await extractMercurySpecs(up);
    else if (src === 'SIERRA') specs = await extractSierraSpecs(up);
  } catch (err) {
    return { sku: up, source: src, source_counts: null, error: `scrape_error:${err.message}` };
  }
  const counts = ((specs.meta || {}).source_counts) || null;
  return { sku: up, source: src, source_counts: counts };
}

async function run() {
  const args = process.argv.slice(2).filter(Boolean);
  if (args.length === 0) {
    console.log('Uso: node repo/scripts/preview_source_counts.js <CODE1> [CODE2 ...]');
    process.exit(1);
  }
  const out = [];
  for (const a of args) out.push(await getCounts(a));
  console.log(JSON.stringify({ ok: true, results: out }, null, 2));
}

(async () => {
  await run();
  process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });