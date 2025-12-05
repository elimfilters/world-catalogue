#!/usr/bin/env node
// Prueba de descripciones hidráulicas por subtipo (ES/EN)
try { require('dotenv').config(); } catch (_) {}

const { generateDescription } = require('../src/utils/descriptionGenerator');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function has(desc, needle) {
  return desc.toLowerCase().includes(String(needle).toLowerCase());
}

function runES() {
  const base = { family: 'HYDRAULIC', duty: 'HD', media_type: 'ELIMTEK™ EXTENDED 99%' };
  const pres = generateDescription({ ...base, subtype: 'Presión', lang: 'es' });
  assert(has(pres, 'Elemento para filtración crítica de línea de presión'), 'ES Presión');

  const ret = generateDescription({ ...base, subtype: 'Retorno', lang: 'es' });
  assert(has(ret, 'Elemento de retorno'), 'ES Retorno');

  const suc = generateDescription({ ...base, subtype: 'Succión', lang: 'es' });
  assert(has(suc, 'Elemento de succión/in-tank'), 'ES Succión');

  const cart = generateDescription({ ...base, subtype: 'Cartucho', lang: 'es' });
  assert(has(cart, 'Elemento tipo cartucho'), 'ES Cartucho');

  const generic = generateDescription({ ...base, subtype: 'Otro', lang: 'es' });
  assert(has(generic, 'Controla contaminación sólida'), 'ES Genérico');
}

function runEN() {
  const base = { family: 'HYDRAULIC', duty: 'HD', media_type: 'ELIMTEK™ EXTENDED 99%' };
  const pres = generateDescription({ ...base, subtype: 'Pressure', lang: 'en' });
  assert(has(pres, 'Critical filtration element for pressure line service'), 'EN Pressure');

  const ret = generateDescription({ ...base, subtype: 'Return', lang: 'en' });
  assert(has(ret, 'Return element'), 'EN Return');

  const suc = generateDescription({ ...base, subtype: 'Suction', lang: 'en' });
  assert(has(suc, 'Suction/in-tank element'), 'EN Suction');

  const cart = generateDescription({ ...base, subtype: 'Cartucho', lang: 'en' });
  assert(has(cart, 'Cartridge-style element'), 'EN Cartridge');

  const generic = generateDescription({ ...base, subtype: 'Other', lang: 'en' });
  assert(has(generic, 'Controls solid contamination'), 'EN Generic');
}

async function main() {
  const results = [];
  const cases = [
    ['ES subtypes', runES],
    ['EN subtypes', runEN]
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
    console.error(`\n${failed.length} pruebas de descripción fallaron.`);
  } else {
    console.log('\nTodas las pruebas de descripciones hidráulicas pasaron.');
  }
}

main().catch(err => {
  console.error('❌ Error en test de descripciones:', err);
  process.exitCode = 1;
});