// Demo: registra un P-series no soportado en el watchlist
// Uso: node scripts/demo_p_watchlist.js

const { validateDonaldsonCode } = require('../src/scrapers/donaldson');

async function run() {
  const samples = ['P571234', 'P591234', 'P731234'];
  for (const code of samples) {
    const res = await validateDonaldsonCode(code);
    console.log(JSON.stringify(res, null, 2));
  }
  console.log('Revisa reports/p_series_watchlist.json para ver el registro actualizado.');
}

run();