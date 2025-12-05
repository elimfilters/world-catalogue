try { require('dotenv').config(); } catch (_) {}

const { upsertBySku } = require('../src/services/syncSheetsService');

async function run() {
  const data = {
    sku: 'EL81807',
    query_normalized: 'P551807',
    type: 'Oil',
    subtype: 'Spin-On Full-Flow',
    family: 'OIL',
    duty: 'HD',
    oem_codes: ['P551807'],
    attributes: {
      iso_main_efficiency_percent: '99.5',
      manufacturing_standards: 'ISO 9001, ISO/TS 16949',
      certification_standards: 'ISO 5011, ISO 4548-12',
      service_life_hours: '500',
      manufactured_by: 'ELIMFILTERS'
    },
    minimal: true
  };

  await upsertBySku(data);
  console.log('Done upsert EL81807 -> P551807');
}

run().catch((e) => { console.error(e); process.exit(1); });