const {
  resolveBrandFamilyDutyByPrefix,
} = require('../src/config/prefixMap');

const samples = [
  // Purolator vs Luber-finer
  { code: 'L14610', expect: { brand: 'PUROLATOR', family: 'OIL' } },
  { code: 'L26', expect: { brand: 'LUBERFINER', family: 'OIL' } },

  // HP collision: K&N vs FRAM Racing
  { code: 'HP-1007', expect: { brand: 'K&N', family: 'OIL' } },
  { code: 'HP8', expect: { brand: 'FRAM', family: 'OIL' } },

  // PF collision: ACDelco
  { code: 'PF48', expect: { brand: 'ACDELCO', family: 'OIL' } },

  // OP collision: Filtron
  { code: 'OP575', expect: { brand: 'FILTRON', family: 'OIL' } },

  // PS collision: FRAM-like vs K&N default
  { code: 'PS7171', expect: { brand: 'FRAM', family: 'FUEL' } },
  { code: 'PS-2010', expect: { brand: 'K&N' } },
];

function run() {
  let failures = 0;
  for (const { code, expect } of samples) {
    const res = resolveBrandFamilyDutyByPrefix(code);
    const okBrand = expect.brand ? res.brand === expect.brand : true;
    const okFamily = expect.family ? res.family === expect.family : true;
    const ok = okBrand && okFamily;
    if (!ok) {
      failures++;
      console.error(`FAIL ${code}: got brand=${res.brand}, family=${res.family}`);
    } else {
      console.log(`PASS ${code}: brand=${res.brand}, family=${res.family}, duty=${res.duty}`);
    }
  }
  if (failures) {
    console.error(`\n${failures} failures`);
    process.exit(1);
  } else {
    console.log('\nAll tests passed');
  }
}

run();