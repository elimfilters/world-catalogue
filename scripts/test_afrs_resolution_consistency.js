// Prueba de consistencia: AF/RS → Donaldson (HD)
// No ejecuta nada externo; valida la normalización y resolución interna.

const { findDonaldsonCode, validateDonaldsonCode } = require('../src/scrapers/donaldson');

function assertEqual(actual, expected, note) {
  if (actual !== expected) {
    throw new Error(`Assert fail: ${note} — expected ${expected}, got ${actual}`);
  }
}

function run() {
  const cases = [
    { input: 'AF25139M', expectedP: 'P527682' },
    { input: 'AF25139', expectedP: 'P527682' },
    { input: 'RS3518', expectedP: 'P527682' },
    { input: 'RS-3518', expectedP: 'P527682' },
    { input: 'fa1077', expectedP: 'P527682' },
    { input: 'WIX-46556', expectedP: 'P527682' },
    { input: 'FRAM-PH7405', expectedP: 'P552100' },
    { input: 'PH7405', expectedP: 'P552100' },
    // OEM → Donaldson (HD) curados
    { input: 'CATERPILLAR-1R0750', expectedP: 'P551311' },
    { input: '1R0750', expectedP: 'P551311' },
    { input: 'BALDWIN-BF7633', expectedP: 'P551313' }
  ];

  for (const c of cases) {
    const pcode = findDonaldsonCode(c.input);
    if (!pcode) {
      throw new Error(`No se resolvió Donaldson para ${c.input}`);
    }
    assertEqual(pcode, c.expectedP, `P-code para ${c.input}`);
  }

  // Validación de código Donaldson homólogo
  return Promise.all(
    cases.map(async c => {
      const v = await validateDonaldsonCode(c.expectedP);
      if (!(v && v.last4)) {
        throw new Error(`Validación sin last4 para ${c.expectedP}`);
      }
      return { input: c.input, pcode: c.expectedP, last4: v.last4 };
    })
  ).then(res => {
    console.log('✅ Consistencia AF/RS→Donaldson OK');
    console.log(res);
    return true;
  });
}

// Export para ejecución no interactiva
module.exports = { run };