/*
 Diagnostic script: test Fleetguard API endpoint for Donaldson codes.
 Prints status, content-type, and JSON keys when available.
 Usage: node scripts/test_fleetguard_endpoint.js [CODE]
*/

'use strict';

const hasGlobalFetch = typeof fetch === 'function';

async function doFetch(url, headers = {}) {
  const defaultHeaders = {
    'Accept': 'application/json, */*;q=0.8',
    'User-Agent': 'ELIMFILTERS/5.0 (+catalogo; FleetguardDiag)'
  };
  const merged = { ...defaultHeaders, ...headers };
  if (hasGlobalFetch) {
    return fetch(url, { method: 'GET', headers: merged });
  }
  const nodeFetch = (await import('node-fetch')).default;
  return nodeFetch(url, { method: 'GET', headers: merged });
}

function getEnv(name, defVal = '') {
  const v = process.env[name];
  return (v == null || v === '') ? defVal : v;
}

async function main() {
  const argCode = process.argv[2];
  const codes = argCode ? [argCode] : ['P551807', 'P552100'];
  const base = getEnv('FLEETGUARD_API_BASE', 'https://www.fleetguard.com/api/v1');
  const token = getEnv('FLEETGUARD_API_TOKEN', getEnv('FLEETGUARD_TOKEN', ''));
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  console.log('Fleetguard API base:', base);
  console.log('Using token:', token ? 'yes' : 'no');

  for (const code of codes) {
    const url = `${base}/products/${encodeURIComponent(code)}`;
    console.log('\nTesting code:', code);
    console.log('URL:', url);
    try {
      const res = await doFetch(url, headers);
      const status = res?.status;
      const ct = (res?.headers && (res.headers.get?.('content-type') || res.headers['content-type'])) || '';
      console.log('Status:', status);
      console.log('Content-Type:', ct || '(none)');

      const isJSON = /application\/json/i.test(ct || '');
      if (!isJSON) {
        const text = await res.text();
        console.log('Non-JSON body (first 200 chars):');
        console.log((text || '').slice(0, 200));
        continue;
      }
      const data = await res.json();
      const keys = data && typeof data === 'object' ? Object.keys(data) : [];
      console.log('JSON keys:', keys.slice(0, 20));
      // Print select fields if present
      const sample = {
        productType: data.productType,
        productFamily: data.productFamily,
        overallHeight: data.overallHeight,
        outerDiameter: data.outerDiameter,
        innerDiameter: data.innerDiameter,
        threadSize: data.threadSize,
      };
      console.log('Sample fields:', sample);
    } catch (err) {
      console.error('Error fetching:', err.message);
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});