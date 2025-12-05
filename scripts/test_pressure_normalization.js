#!/usr/bin/env node
// Pruebas puntuales de normalización de presión (MPa/Pa→PSI) y validación max < burst
try { require('dotenv').config(); } catch (_) {}

const { buildRowData } = require('../src/services/syncSheetsService');

function assertAlmostEqual(name, actual, expected, tol = 0.05) {
  const ok = Math.abs(actual - expected) <= tol;
  if (!ok) throw new Error(`${name}: esperado ≈ ${expected}, obtenido ${actual}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runCaseMPaToPsi() {
  const data = {
    type: 'HIDRÁULICO',
    attributes: {
      operating_pressure_max_psi: '25 MPa'
    }
  };
  const row = buildRowData(data);
  const val = Number(row.operating_pressure_max_psi);
  // 25 MPa → 25 * 145.038 = 3625.95 psi
  assertAlmostEqual('MPa→PSI (op max)', val, 25 * 145.038, 0.05);
}

function runCasePaToPsiBurst() {
  const data = {
    type: 'HIDRÁULICO',
    attributes: {
      hydrostatic_burst_psi: '1000000 Pa'
    }
  };
  const row = buildRowData(data);
  const val = Number(row.hydrostatic_burst_psi);
  // 1,000,000 Pa → 145.038 psi → rounded to 145
  assert(val === 145, 'Pa→PSI (burst) debe ser 145');
}

function runCaseQualityOkDifferentUnits() {
  const data = {
    type: 'HIDRÁULICO',
    attributes: {
      operating_pressure_max_psi: '250 bar', // ≈ 3625 psi
      hydrostatic_burst_psi: '26 MPa'        // ≈ 3771 psi
    }
  };
  const row = buildRowData(data);
  // Debe pasar (max < burst). Puede haber advertencia por factor de seguridad.
  const flag = String(row.operating_pressure_max_quality_flag || '');
  const max = Number(row.operating_pressure_max_psi);
  const burst = Number(row.hydrostatic_burst_psi);
  console.log(`Debug Quality OK: max=${max}, burst=${burst}, flag='${flag}'`);
  assert(max < burst, 'max debe ser < burst en valores normalizados.');
  // Aceptamos vacío o advertencia de "factor de seguridad"; rechazamos incoherencia ≥ Estallido
  const isIncoherent = /incoherente/i.test(flag);
  assert(!isIncoherent, 'Quality flag no debe marcar incoherencia (≥ Estallido) cuando max < burst.');
}

function runCaseQualityFailDifferentUnits() {
  const data = {
    type: 'HIDRÁULICO',
    attributes: {
      operating_pressure_max_psi: '20 MPa', // ≈ 2900.76 psi
      hydrostatic_burst_psi: '19 MPa'       // ≈ 2755.72 psi
    }
  };
  const row = buildRowData(data);
  // Debe fallar (max ≥ burst) → flag no vacío
  assert(!!String(row.operating_pressure_max_quality_flag || ''), 'Quality flag debe señalar incoherencia (max ≥ burst).');
}

async function main() {
  const results = [];
  const cases = [
    ['MPa→PSI (op max)', runCaseMPaToPsi],
    ['Pa→PSI (burst)', runCasePaToPsiBurst],
    ['Quality OK (bar vs MPa)', runCaseQualityOkDifferentUnits],
    ['Quality FAIL (MPa vs MPa)', runCaseQualityFailDifferentUnits]
  ];

  for (const [name, fn] of cases) {
    try {
      await fn();
      results.push({ name, ok: true });
    } catch (err) {
      results.push({ name, ok: false, error: err.message });
    }
  }

  const failed = results.filter(r => !r.ok);
  results.forEach(r => {
    if (r.ok) console.log(`✅ ${r.name}`);
    else console.error(`❌ ${r.name} → ${r.error}`);
  });

  if (failed.length) {
    process.exitCode = 1;
    console.error(`\n${failed.length} pruebas fallaron.`);
  } else {
    console.log('\nTodas las pruebas de presión pasaron.');
  }
}

main().catch(err => {
  console.error('❌ Error en test:', err);
  process.exitCode = 1;
});