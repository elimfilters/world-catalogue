const { resolveBrandFamilyDutyByPrefix } = require('../src/config/prefixMap');
const { tokenMatchesAftermarket, detectAftermarketBrandFromText, orderByCrossBrandPriority } = require('../src/scrapers/fram');
const { orderDonaldsonCrossByPriority } = require('../src/scrapers/donaldson');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function testToken(brand, token, expectedMatch = true) {
  const ok = tokenMatchesAftermarket(token, brand);
  assert(expectedMatch ? ok : !ok, `${brand} token ${token} expected ${expectedMatch} but got ${ok}`);
  console.log(`PASS ${brand} token ${token}`);
}

function testResolve(code, expect) {
  const res = resolveBrandFamilyDutyByPrefix(code);
  if (!res) throw new Error(`Resolver returned null for ${code}`);
  if (expect.brand) assert(res.brand === expect.brand, `${code} brand=${res.brand} expected ${expect.brand}`);
  if (expect.family) assert(res.family === expect.family, `${code} family=${res.family} expected ${expect.family}`);
  if (expect.duty) assert(res.duty === expect.duty, `${code} duty=${res.duty} expected ${expect.duty}`);
  console.log(`PASS resolve ${code}: brand=${res.brand}, family=${res.family}, duty=${res.duty}`);
}

function run() {
  // Regional brand patterns
  testToken('TECFIL', 'PSL-356');
  testToken('TECFIL', 'PEL115');
  testToken('TECFIL', 'ARL-2591');
  testToken('TECFIL', 'PTL220');
  // Extras habilitados: TXL, WP, WD
  testToken('TECFIL', 'TXL-100');
  testToken('TECFIL', 'WP-120');
  testToken('TECFIL', 'WD-50');

  testToken('WEGA', 'WO-119');
  testToken('WEGA', 'WL710');
  testToken('WEGA', 'WA-1001');
  testToken('WEGA', 'WFC110');

  testToken('VOX', 'VO-1202');
  testToken('GFC', 'GFC-5401');
  testToken('FILTROS WEB', 'WEB-210');
  // HIFI FILTER
  testToken('HIFI FILTER', 'SO-123');
  testToken('HIFI FILTER', 'SH60103');
  testToken('HIFI FILTER', 'SA-16183');
  testToken('HIFI FILTER', 'TT-100');
  testToken('HIFI FILTER', 'HF250');
  // PURFLUX
  testToken('PURFLUX', 'LS867B');
  testToken('PURFLUX', 'LS-933');

  // Brand text detection sanity
  const sampleText = 'Filtro de aceite Tecfil PSL-356, calidad OEM';
  const detected = detectAftermarketBrandFromText(sampleText.toLowerCase());
  assert(detected === 'TECFIL', `detect brand from text failed: ${detected}`);
  console.log('PASS detectAftermarketBrandFromText Tecfil');

  // Text detection for newly added brands
  assert(detectAftermarketBrandFromText('purflux ls867b') === 'PURFLUX', 'detect text PURFLUX failed');
  console.log('PASS detectAftermarketBrandFromText Purflux');
  assert(detectAftermarketBrandFromText('vic filter c-306') === 'VIC FILTER', 'detect text VIC FILTER failed');
  console.log('PASS detectAftermarketBrandFromText VIC Filter');
  assert(detectAftermarketBrandFromText('ufi filters 25.104.00') === 'UFI FILTERS', 'detect text UFI FILTERS failed');
  console.log('PASS detectAftermarketBrandFromText UFI Filters');
  assert(detectAftermarketBrandFromText('valeo 586503') === 'VALEO', 'detect text VALEO failed');
  console.log('PASS detectAftermarketBrandFromText Valeo');
  assert(detectAftermarketBrandFromText('napa gold 1069') === 'NAPA', 'detect text NAPA failed');
  console.log('PASS detectAftermarketBrandFromText NAPA');
  assert(detectAftermarketBrandFromText('stp s8872') === 'STP', 'detect text STP failed');
  console.log('PASS detectAftermarketBrandFromText STP');
  assert(detectAftermarketBrandFromText('ecogard x461') === 'ECOGARD', 'detect text ECOGARD failed');
  console.log('PASS detectAftermarketBrandFromText Ecogard');
  assert(detectAftermarketBrandFromText('premium guard pg4386') === 'PREMIUM GUARD', 'detect text PREMIUM GUARD failed');
  console.log('PASS detectAftermarketBrandFromText Premium Guard');

  // Regional priority ordering checks
  const prevRegion = process.env.MARKET_REGION;
  try {
    process.env.MARKET_REGION = 'EU';
    const euTokens = ['mann w712/83', 'hifi filter so-123', 'purflux ls867b', 'tecfil psl-356'];
    const euOrdered = orderByCrossBrandPriority([...euTokens]);
    const top3 = euOrdered.slice(0, 3).join(' ');
    assert(top3.includes('mann') && top3.includes('hifi filter') && top3.includes('purflux'), 'EU priority failed: expected MANN/HIFI FILTER/PURFLUX in top three');
    console.log('PASS EU regional priority ordering (MANN/HIFI/PURFLUX in top 3)');

    process.env.MARKET_REGION = 'LATAM';
    const laTokens = ['tecfil psl-356', 'wega wl710', 'purflux ls867b', 'hifi filter so-123'];
    const laOrdered = orderByCrossBrandPriority([...laTokens]);
    assert(laOrdered[0].includes('tecfil') || laOrdered[0].includes('wega'), 'LATAM priority failed: expected TECFIL/WEGA first');
    assert(laOrdered[1].includes('tecfil') || laOrdered[1].includes('wega'), 'LATAM priority failed: expected TECFIL/WEGA in top two');
    console.log('PASS LATAM regional priority ordering');

    // HD Donaldson ordering tests
    process.env.MARKET_REGION = 'US';
    const hdNaTokens = [
      'WIX-51348',
      'BALDWIN-B495',
      'MANN-W712/83',
      'FLEETGUARD-LF3620',
      'TECFIL-PSL356',
      'DONALDSON-P552100'
    ];
    const hdNaOrdered = orderDonaldsonCrossByPriority([...hdNaTokens]);
    const hdNaTop5 = hdNaOrdered.slice(0,5).map(s => s.split(/[- ]/)[0]);
    assert(hdNaTop5[0] === 'DONALDSON', 'HD NA: DONALDSON should be first');
    assert(hdNaTop5[1] === 'FLEETGUARD', 'HD NA: FLEETGUARD should be second');
    assert(hdNaTop5[2] === 'BALDWIN', 'HD NA: BALDWIN should be third');
    assert(hdNaTop5[3] === 'WIX', 'HD NA: WIX should be fourth');
    assert(hdNaTop5[4] === 'MANN', 'HD NA: MANN should be fifth');
    console.log('PASS HD NA/US regional priority ordering');

    process.env.MARKET_REGION = 'LATAM';
    const hdLatamTokens = [
      'DONALDSON-P552100',
      'FLEETGUARD-LF3620',
      'TECFIL-PSL356',
      'WEGA-WL710',
      'VOX-VO-1202',
      'GFC-GFC-5401',
      'CATERPILLAR-1R-1808',
      'MACK-485',
      'VOLVO-851',
      'BALDWIN-B495',
      'WIX-51348'
    ];
    const hdLaOrdered = orderDonaldsonCrossByPriority([...hdLatamTokens]);
    const normLa = (s) => s.toUpperCase();
    const idxLa = (brand) => hdLaOrdered.findIndex(t => normLa(t).includes(brand));
    assert(idxLa('DONALDSON') === 0, 'HD LATAM: DONALDSON should be first');
    assert(idxLa('FLEETGUARD') === 1, 'HD LATAM: FLEETGUARD should be second');
    const firstOemLa = Math.min(...['CATERPILLAR','MACK','VOLVO'].map(b => idxLa(b)).filter(i => i > -1));
    ['TECFIL','WEGA','VOX','GFC'].forEach(b => {
      const i = idxLa(b);
      assert(i > -1, `HD LATAM: missing ${b}`);
      assert(i < firstOemLa, `HD LATAM: ${b} should come before OEMs`);
    });
    console.log('PASS HD LATAM regional priority ordering (LATAM aftermarket first)');

    process.env.MARKET_REGION = 'EU';
    const hdEuTokens = [
      'MAHLE-OC205',
      'HENGST-H90W',
      'MANN-W712/83',
      'FLEETGUARD-LF3620',
      'DONALDSON-P552100'
    ];
    const hdEuOrdered = orderDonaldsonCrossByPriority([...hdEuTokens]);
    const hdEuTop5 = hdEuOrdered.slice(0,5).map(s => s.split(/[- ]/)[0]);
    assert(hdEuTop5[0] === 'DONALDSON', 'HD EU: DONALDSON should be first');
    assert(hdEuTop5[1] === 'FLEETGUARD', 'HD EU: FLEETGUARD should be second');
    assert(hdEuTop5[2] === 'MANN', 'HD EU: MANN should be third');
    assert(hdEuTop5[3] === 'MAHLE', 'HD EU: MAHLE should be fourth');
    assert(hdEuTop5[4] === 'HENGST', 'HD EU: HENGST should be fifth');
    console.log('PASS HD EU regional priority ordering');

    // OEM ordering NA/US: expect OEMs after DONALDSON/FLEETGUARD before aftermarket
    process.env.MARKET_REGION = 'US';
    const hdNaOemTokens = [
      'CATERPILLAR-1R-1808',
      'DETROIT DIESEL-23518480',
      'MACK-485',
      'JOHN-DEERE-RE509031',
      'VOLVO-851',
      'KOMATSU-600-185-1230',
      'DONALDSON-P552100',
      'FLEETGUARD-LF3620',
      'BALDWIN-B495',
      'WIX-51348'
    ];
    const hdNaOemOrdered = orderDonaldsonCrossByPriority([...hdNaOemTokens]);
    console.log('HD NA OEM ordered:', hdNaOemOrdered);
    assert(hdNaOemOrdered[0].startsWith('DONALDSON'), 'HD NA OEM: DONALDSON first');
    assert(hdNaOemOrdered[1].startsWith('FLEETGUARD'), 'HD NA OEM: FLEETGUARD second');
    const norm = (s) => s.toUpperCase().replace(/[-_]+/g,' ');
    const idx = (brand) => hdNaOemOrdered.findIndex(t => norm(t).includes(brand));
    const ibal = idx('BALDWIN');
    const iwix = idx('WIX');
    // OEMs must appear before BALDWIN/WIX in NA/US
    ['CATERPILLAR','DETROIT DIESEL','MACK','JOHN DEERE','VOLVO','KOMATSU'].forEach(b => {
      const i = idx(b);
      assert(i > -1, `HD NA OEM: missing ${b}`);
      assert(i < ibal && i < iwix, `HD NA OEM: ${b} should appear before aftermarket`);
    });
    console.log('PASS HD NA/US OEM ordering');

    // EU OEM ordering: after core EU aftermarket
    process.env.MARKET_REGION = 'EU';
    const hdEuOemTokens = [
      'MERCEDES-BENZ-A123',
      'BMW-11427512300',
      'VOLKSWAGEN-06A115561B',
      'AUDI-06D115562',
      'SKODA-06A115561B',
      'OPEL-OC205',
      'TESLA-1107690-00-A',
      'DONALDSON-P551808',
      'FLEETGUARD-LF3620',
      'MANN-W712/83',
      'MAHLE-OC205',
      'HENGST-H90W'
    ];
    const hdEuOemOrdered = orderDonaldsonCrossByPriority([...hdEuOemTokens]);
    console.log('HD EU OEM ordered:', hdEuOemOrdered);
    assert(hdEuOemOrdered[0].startsWith('DONALDSON'), 'HD EU OEM: DONALDSON first');
    assert(hdEuOemOrdered[1].startsWith('FLEETGUARD'), 'HD EU OEM: FLEETGUARD second');
    // Ensure EU aftermarket core appears before EU OEMs
    const normEU = (s) => s.toUpperCase().replace(/[-_]+/g,' ');
    const idxEU = (brand) => hdEuOemOrdered.findIndex(t => normEU(t).includes(brand));
    ['MANN','MAHLE','HENGST'].forEach(b => assert(idxEU(b) > -1, `HD EU OEM: missing ${b}`));
    const firstOemIdx = Math.min(...['MERCEDES','BMW','VOLKSWAGEN','AUDI','SKODA','OPEL'].map(b => idxEU(b)).filter(i => i > -1));
    const maxAfterIdx = Math.max(idxEU('MANN'), idxEU('MAHLE'), idxEU('HENGST'));
    assert(firstOemIdx > maxAfterIdx, 'HD EU OEM: European OEMs should follow core aftermarket');
    console.log('PASS HD EU OEM ordering');
  } finally {
    process.env.MARKET_REGION = prevRegion;
  }

  // Edge cases using prefix resolver
  testResolve('PL14610', { brand: 'PUROLATOR', family: 'OIL', duty: 'HD' });
  testResolve('OC205', { brand: 'MAHLE', family: 'OIL', duty: 'HD' });
  testResolve('OP575', { brand: 'FILTRON', family: 'OIL', duty: 'HD' });
  testResolve('OP575/1', { brand: 'FILTRON', family: 'OIL', duty: 'HD' });

  console.log('\nAll regional brand tests passed');
}

run();