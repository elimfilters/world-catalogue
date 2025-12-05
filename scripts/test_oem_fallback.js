// Quick OEM fallback demo: runs detection for sample OEM-like codes
// Usage: node scripts/test_oem_fallback.js

const { detectFilter } = require('../src/services/detectionServiceFinal');

async function run() {
  const samples = [
    '90915-YZZN1', // Toyota oil (LD)
    '1R0750'      // CAT fuel (HD)
  ];

  for (const code of samples) {
    try {
      const res = await detectFilter({ query: code });
      const summary = {
        code,
        status: res?.status || null,
        source: res?.source || null,
        family: res?.family || null,
        duty: res?.duty || null,
        sku: res?.sku || null,
        message: res?.message || null
      };
      console.log('———');
      console.log(summary);
    } catch (err) {
      console.error(`Error testing ${code}:`, err.message);
    }
  }
}

run();