// Quick test script to validate Donaldson (HD) detection and SKU generation
// Usage: node scripts/test_donaldson_codes.js

const { detectFilter } = require('../src/services/detectionServiceFinal');

async function run() {
  const codes = [
    '23518480',
    '4983053',
    '1R-1808',
    'RE509031',
    '81.08300-9404'
  ];

  const results = [];
  for (const code of codes) {
    try {
      const res = await detectFilter(code, 'es', { force: false, generateAll: false });
      results.push({
        code,
        status: 'OK',
        duty: res.duty,
        source: res.source,
        family: res.family,
        sku: res.sku,
        last4: res.sku ? res.sku.slice(-4) : null,
        message: res.message || ''
      });
    } catch (err) {
      results.push({ code, status: 'ERROR', error: err && err.message ? err.message : String(err) });
    }
  }

  console.log(JSON.stringify({ results }, null, 2));
}

run();