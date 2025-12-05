try { require('dotenv').config(); } catch (_) {}

const { enforceSkuPolicyInvariant } = require('../src/services/skuCreationPolicy');
const { resolveBrandFamilyDutyByPrefix } = require('../src/config/prefixMap');
const { extract4Digits } = require('../src/utils/digitExtractor');

function buildPayload({ sku, code, source, donaldson_code, fram_code, homologated_code }) {
  // 1) Intentamos resolver por prefijo del código de entrada (AF/RE/1R/etc.)
  const hint = resolveBrandFamilyDutyByPrefix(code) || {};
  let family = String(hint.family || '').toUpperCase();
  let duty = String(hint.duty || '').toUpperCase();

  // 2) Si no hay familia/duty, inferimos por el prefijo del SKU (EA1/EL8/EF9/EC1)
  if (!family || !duty) {
    const p = String(sku || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (p.startsWith('EA1')) { family = 'AIRE'; duty = 'HD'; }
    else if (p.startsWith('EL8')) { family = 'OIL'; duty = 'HD'; }
    else if (p.startsWith('EF9')) { family = 'FUEL'; duty = 'HD'; }
    else if (p.startsWith('EC1')) { family = 'CABIN'; duty = 'HD'; }
  }

  return {
    sku,
    family,
    duty,
    source: source || 'OEM',
    query_normalized: code,
    code_oem: code,
    oem_equivalent: code,
    donaldson_code,
    fram_code,
    homologated_code
  };
}

async function run() {
  const cases = [
    // OEM fallback incorrecto: PA no puede ir a EL8
    { name: 'Incorrecto PA→EL8', sku: 'EL82831', code: 'PA2831', source: 'OEM', expectOk: false },
    // Homologado con Donaldson: usar C125004 → últimos 4 = 5004
    { name: 'Correcto PA→EA1 via DONALDSON', sku: 'EA15004', code: 'PA2831', source: 'DONALDSON', donaldson_code: 'C125004', expectOk: true },
    // Homologado con Donaldson pero con last4 equivocado
    { name: 'Incorrecto PA→EA1 last4 OEM en HD', sku: 'EA12831', code: 'PA2831', source: 'DONALDSON', donaldson_code: 'C125004', expectOk: false }
  ];

  for (const c of cases) {
    const payload = buildPayload({ sku: c.sku, code: c.code, source: c.source, donaldson_code: c.donaldson_code, fram_code: c.fram_code, homologated_code: c.homologated_code });
    const res = enforceSkuPolicyInvariant(payload);
    console.log(`Case: ${c.name} | sku=${c.sku} code=${c.code} →`, res);
    if (c.expectOk && !res.ok) {
      console.error(`❌ Falló caso esperado OK: ${c.name} → ${res.error}`);
      process.exitCode = 1;
    }
    if (!c.expectOk && res.ok) {
      console.error(`❌ Pasó caso esperado FAIL: ${c.name}`);
      process.exitCode = 1;
    }
  }

  console.log('✅ Pruebas de guardia de política completadas');
}

run().catch(err => { console.error(err); process.exit(1); });