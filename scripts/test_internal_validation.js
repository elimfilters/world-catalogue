/*
 Minimal internal validation test suite
 - Verifies last 10 codes classify as FINAL/Homologada
 - Asserts R90T maps to PARKER/FUEL
 - Asserts 23518480 maps to DETROIT DIESEL/OIL
*/

const assert = require('assert');
const { validateBatch } = require('../src/services/internalValidationService');
const { spawnSync } = require('child_process');
const path = require('path');

function parseArgs(argv) {
  const args = argv.slice(2);
  const out = { quiet: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--no-strict-note' || a === '-q') {
      out.quiet = true;
    } else if (a === '--help' || a === '-h') {
      out.help = true;
    }
  }
  return out;
}

async function run({ quiet = false } = {}) {
  const batch = [
    'P552100',
    'WK 950/20',
    'PH3614',
    'CA8612',
    'AF25740',
    'R90T',
    'BF7634',
    'LFP9000',
    '23518480',
    'LF3620'
  ];

  const { results, summary } = await validateBatch(batch);

  // 1) All 10 codes must be FINAL/Homologada
  const nonFinal = results.filter(r => r.status !== 'FINAL/Homologada');
  if (nonFinal.length) {
    console.error('Found non-final classifications:', nonFinal);
  }
  assert.strictEqual(nonFinal.length, 0, 'All 10 codes should be FINAL/Homologada');

  // 2) Collision corrected: R90T must be PARKER/FUEL
  const r90 = results.find(r => r.input.toUpperCase().includes('R90T'));
  assert.ok(r90, 'R90T result present');
  assert.strictEqual(r90.brand, 'PARKER', 'R90T brand should be PARKER');
  assert.strictEqual(r90.family, 'FUEL', 'R90T family should be FUEL');

  // 3) Pure OEM: 23518480 must be DETROIT DIESEL/OIL
  const dd = results.find(r => r.input === '23518480');
  assert.ok(dd, '23518480 result present');
  assert.strictEqual(dd.brand, 'DETROIT DIESEL', '23518480 brand should be DETROIT DIESEL');
  assert.strictEqual(dd.family, 'OIL', '23518480 family should be OIL');

  if (!quiet) {
    console.log('OK: Internal validation minimal suite passed.');
    console.log('Summary:', JSON.stringify(summary, null, 2));
  }

  // Run pressure normalization suite
  const pressurePath = path.join(__dirname, 'test_pressure_normalization.js');
  const pr = spawnSync(process.execPath, [pressurePath], { stdio: 'inherit' });
  if (pr.status !== 0) {
    throw new Error('Pressure normalization suite failed.');
  }

  // Run hydraulic descriptions suite (ES/EN)
  const descPath = path.join(__dirname, 'test_hydraulic_descriptions.js');
  const dr = spawnSync(process.execPath, [descPath], { stdio: 'inherit' });
  if (dr.status !== 0) {
    throw new Error('Hydraulic descriptions suite failed.');
  }
}

(function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log('Uso: node repo/scripts/test_internal_validation.js [-q|--no-strict-note]');
    process.exit(0);
  }
  run({ quiet: !!args.quiet }).catch(err => {
    console.error('Test suite failed:', err && err.stack ? err.stack : err);
    process.exit(1);
  });
})();