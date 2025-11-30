const { validateFramCode } = require('../scrapers/fram');

async function run() {
  const samples = [
    // OIL series
    'PH7405',
    'TG7317',
    'XG7317',
    'HM3614',
    // AIRE
    'CA4309',
    // CABIN
    'CF9719',
    'CH9911',
    // FUEL
    'G3727',
    'PS10942',
    'PS-2010',
    // Invalids (should be rejected by strict patterns)
    'PH8A',
    'PX7317',
    'XYZ1234'
  ];

  for (const code of samples) {
    const res = await validateFramCode(code);
    console.log(
      JSON.stringify(
        {
          code,
          valid: !!res.valid,
          family: res.family || null,
          series: res.attributes?.series || null,
          last4: res.last4 || null,
          reason: res.reason || null
        },
        null,
        2
      )
    );
  }
}

run();