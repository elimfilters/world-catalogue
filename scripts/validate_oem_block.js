/*
 Governance script: validate OEM/competitor dictionary blocks before PR.
 Checks:
 1) JSON válido y estructura esperada.
 2) Normalización de claves (codes) según normalize().
 3) Marcas canónicas en MAYÚSCULAS y dentro del conjunto permitido.
 4) Familias canónicas dentro del conjunto permitido.
 5) Sin colisiones preexistentes: si el código coincide con una colisión de prefixMap,
    la entrada debe respetar la marca/familia preferidas por la colisión.
 6) Conflictos con el diccionario base (si se valida un archivo distinto al base).
 Uso:
   node scripts/validate_oem_block.js --file src/data/oem_xref.json
*/

const fs = require('fs');
const path = require('path');
const { normalize, resolveBrandFamilyDutyByPrefix } = require('../src/config/prefixMap');

const args = process.argv.slice(2);
const fileArg = args.find(a => a.startsWith('--file='));
const candidatePath = fileArg ? fileArg.split('=')[1] : 'src/data/oem_xref.json';
const basePath = 'src/data/oem_xref.json';

const ALLOWED_BRANDS = new Set([
  'DETROIT DIESEL', 'CUMMINS', 'CATERPILLAR', 'TOYOTA', 'NISSAN', 'HONDA', 'FORD', 'ACDELCO',
  'VOLKSWAGEN', 'BMW', 'MERCEDES', 'HYUNDAI', 'SUZUKI', 'PARKER', 'BALDWIN', 'LUBERFINER',
  'MANN', 'FLEETGUARD', 'DONALDSON', 'FRAM', 'WIX', 'SAKURA', 'MAHLE', 'HENGST', 'RYCO',
  'FILTRON', 'PUROLATOR', 'UFI', 'HASTINGS', 'ROKI', 'TOKYOROKI'
]);

const ALLOWED_FAMILIES = new Set(['OIL', 'FUEL', 'AIRE', 'HYDRAULIC', 'COOLANT']);

function readJson(fp) {
  const abs = path.resolve(process.cwd(), fp);
  const raw = fs.readFileSync(abs, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`JSON inválido en ${fp}: ${e.message}`);
  }
}

function validateDict(dict, label) {
  const errors = [];
  if (!dict || typeof dict !== 'object' || Array.isArray(dict)) {
    errors.push(`[${label}] Debe ser un objeto JSON plano { code: { brand, family } }`);
    return errors;
  }

  for (const [code, meta] of Object.entries(dict)) {
    const n = normalize(code);
    if (n !== code) {
      errors.push(`[${label}] Clave no normalizada: '${code}' → debería ser '${n}'`);
    }
    if (!meta || typeof meta !== 'object') {
      errors.push(`[${label}] Entrada inválida para '${code}': debe ser objeto { brand, family }`);
      continue;
    }
    const brand = meta.brand;
    const family = meta.family;
    if (!brand || typeof brand !== 'string') {
      errors.push(`[${label}] Marca faltante o inválida para '${code}'`);
    } else {
      const b = brand.toUpperCase();
      if (brand !== b) {
        errors.push(`[${label}] Marca no canónica para '${code}': '${brand}' → debería ser '${b}'`);
      }
      if (!ALLOWED_BRANDS.has(b)) {
        errors.push(`[${label}] Marca no reconocida para '${code}': '${brand}' (fuera del conjunto canónico)`);
      }
    }
    if (family) {
      const f = String(family).toUpperCase();
      if (family !== f) {
        errors.push(`[${label}] Familia no canónica para '${code}': '${family}' → debería ser '${f}'`);
      }
      if (!ALLOWED_FAMILIES.has(f)) {
        errors.push(`[${label}] Familia no reconocida para '${code}': '${family}' (fuera del conjunto permitido)`);
      }
    }

    // Colisiones conocidas: si resolve indica colisión, validar coherencia
    const res = resolveBrandFamilyDutyByPrefix(code) || {};
    if (res.collision) {
      const expectedBrand = res.brand || null;
      const expectedFamily = res.family || null;
      const b = meta.brand ? meta.brand.toUpperCase() : null;
      const f = meta.family ? meta.family.toUpperCase() : null;
      if (expectedBrand && b && b !== expectedBrand) {
        errors.push(`[${label}] Colisión resuelta para '${code}': marca esperada '${expectedBrand}', encontrada '${b}'`);
      }
      if (expectedFamily && f && f !== expectedFamily) {
        errors.push(`[${label}] Colisión resuelta para '${code}': familia esperada '${expectedFamily}', encontrada '${f}'`);
      }
    }
  }
  return errors;
}

function main() {
  console.log(`🔎 Validando diccionario: ${candidatePath}`);
  const candidate = readJson(candidatePath);
  const errors = validateDict(candidate, 'candidate');

  // Conflictos con base si se valida archivo distinto
  if (path.resolve(candidatePath) !== path.resolve(basePath)) {
    console.log(`🔎 Comparando contra base: ${basePath}`);
    const base = readJson(basePath);
    for (const [code, meta] of Object.entries(candidate)) {
      if (base[code]) {
        const b1 = String(meta.brand || '').toUpperCase();
        const b2 = String(base[code].brand || '').toUpperCase();
        const f1 = meta.family ? String(meta.family).toUpperCase() : null;
        const f2 = base[code].family ? String(base[code].family).toUpperCase() : null;
        if (b1 && b2 && b1 !== b2) {
          errors.push(`[diff] Conflicto de marca para '${code}': candidato '${b1}' vs base '${b2}'`);
        }
        if (f1 && f2 && f1 !== f2) {
          errors.push(`[diff] Conflicto de familia para '${code}': candidato '${f1}' vs base '${f2}'`);
        }
      }
    }
  }

  if (errors.length) {
    console.error('❌ Validación de gobernanza fallida. Problemas detectados:');
    for (const e of errors) console.error(' -', e);
    process.exit(1);
  }

  console.log('✅ Gobernanza OK: JSON válido, claves normalizadas, marcas/familias canónicas y sin colisiones reintroducidas.');
}

main();