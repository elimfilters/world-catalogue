try { require('dotenv').config(); } catch (_) {}
const { upsertBySku } = require('../src/services/syncSheetsService');

async function run() {
  const tests = [
    {
      sku: 'EL84967',
      query_normalized: 'PH4967',
      type: 'Oil',
      subtype: 'Spin-On Full-Flow',
      family: 'OIL',
      attributes: {
        height_mm: '132',
        outer_diameter_mm: '76',
        thread_size: '3/4"-16 UNF',
      },
      funcion: 'Filtro de aceite',
    },
    {
      sku: 'EF91313',
      query_normalized: 'P551313',
      type: 'Fuel',
      subtype: 'Spin-On',
      family: 'FUEL',
      attributes: {
        height_mm: '150',
        outer_diameter_mm: '93',
        thread_size: '1"-12 UNF',
      },
      funcion: 'Filtro de combustible',
    },
  ];

  for (const data of tests) {
    // Si no tienes credenciales locales, este script fallará.
    // Para poblar type/family, usa populate_master_skus.js con detección.
    const result = await upsertBySku(data);
    console.log(`Upsert ${data.sku}:`, result);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});