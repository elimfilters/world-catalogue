'use strict';

const { scrapeFleetguardBySearch } = require('../src/scrapers/fleetguardScraper');

async function run(code, fleetguardSku) {
  console.log(`\n=== Fleetguard scrape test for ${code} ${fleetguardSku ? '(FG:'+fleetguardSku+')' : ''} ===`);
  try {
    const out = await scrapeFleetguardBySearch(code, { fleetguardSku });
    console.log('Technical:', out.technical);
    console.log('Cross Codes (sample):', (out.crossCodes || []).slice(0, 20));
  } catch (e) {
    console.error('Error:', e.message);
  }
}

(async () => {
  const args = process.argv.slice(2);
  if (args.length >= 2) {
    await run(args[0], args[1]);
  } else {
    const list = ['P551807', 'P554004'];
    for (const code of list) {
      await run(code);
    }
  }
})();