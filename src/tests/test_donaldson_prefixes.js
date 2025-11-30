const { validateDonaldsonCode } = require('../scrapers/donaldson');

async function run() {
  const samples = [
    'DBA5000',
    'DBL7349',
    'ELF7349',
    'P552100', // P55xxxx → OIL
    'P771511', // P77xxxx → AIRE
    'P782105', // P78xxxx → AIRE
    'P627763', // P62xxxx → AIRE
    'P561131', // P56xxxx → FUEL
    'P601234', // P60xxxx → COOLANT
    'P150695', // P15xxxx → AIRE
    'P171234', // P17xxxx → AIRE
    'P181234', // P18xxxx → AIRE
    'C105004',
    'ECC12345',
    'FPG12345',
    'FFP12345',
    'FFS12345',
    'HFA12345',
    'HFP12345',
    'EAF12345',
    'X123456'
  ];

  for (const code of samples) {
    const res = await validateDonaldsonCode(code);
    console.log(
      JSON.stringify(
        {
          code,
          valid: res.valid,
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