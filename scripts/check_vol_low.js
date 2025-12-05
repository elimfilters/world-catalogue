// =============================================================================
// VOL_LOW Audit Script (QA)
// Purpose: Evaluate VOL_LOW without attempting persistence (Mongo disabled)
// Usage:
//   node scripts/check_vol_low.js --file skus.txt [--lang es] [--json]
//   node scripts/check_vol_low.js P551313 AF25139 4881643 --lang es
// Notes:
//   - Mongo writes are disabled by clearing `MONGODB_URI`.
//   - The script calls detectionServiceFinal.detectFilter to leverage core logic.
//   - VOL_LOW is computed from unique engine/equipment applications in the response.
// =============================================================================

'use strict';

// Ensure Mongo persistence is disabled for audit runs
process.env.MONGODB_URI = '';

const fs = require('fs');
const path = require('path');
const { detectFilter } = require('../src/services/detectionServiceFinal');

function parseArgs(argv) {
  const out = { file: null, lang: 'es', json: false, skus: [], out: null, strict: false, noStrictNote: false };
  const args = argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--file' || a === '-f') {
      out.file = args[i + 1]; i++;
    } else if (a === '--lang' || a === '-l') {
      out.lang = args[i + 1] || out.lang; i++;
    } else if (a === '--json' || a === '-j') {
      out.json = true;
    } else if (a === '--out' || a === '-o') {
      out.out = args[i + 1]; i++;
    } else if (a === '--strict' || a === '-s') {
      out.strict = true;
    } else if (a === '--no-strict-note' || a === '-q') {
      out.noStrictNote = true;
    } else if (a === '--help' || a === '-h') {
      out.help = true;
    } else {
      out.skus.push(a);
    }
  }
  return out;
}

function printHelp() {
  console.log(`
Uso:
  node scripts/check_vol_low.js --file skus.txt [--lang es] [--json]
  node scripts/check_vol_low.js P551313 AF25139 4881643 --lang es

Opciones:
  --file, -f   Ruta a archivo con SKUs (uno por línea)
  --lang, -l   Idioma del flujo de detección (por defecto: es)
  --json, -j   Output JSON estructurado (además de resumen)
  --out,  -o   Ruta de salida para guardar informe JSON (archivo o directorio)
  --strict,-s  QA duro: convertir advertencias en fallos (exit code 1)
  --no-strict-note, -q  Silenciar aviso de modo estricto en consola
  --help, -h   Mostrar ayuda
`);
}

function toArray(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  const s = String(v || '').trim();
  if (!s) return [];
  // Split by comma for sheet-style fields
  return s.split(',').map(x => String(x).trim()).filter(Boolean);
}

function countUniqueApps(apps) {
  const arr = Array.isArray(apps) ? apps : toArray(apps);
  const set = new Set();
  const preview = [];
  for (const item of arr) {
    let name = '';
    let years = '';
    if (item && typeof item === 'object') {
      name = String(item.name || '').trim();
      years = String(item.years || '').trim();
    } else {
      const s = String(item || '').trim();
      if (!s) continue;
      // Best-effort: treat entire string as name, try to extract trailing year tokens
      name = s;
      years = '';
    }
    if (!name) continue;
    const key = `${name.toUpperCase()}|${years}`;
    if (!set.has(key)) {
      set.add(key);
      if (preview.length < 6) preview.push({ name, years });
    }
  }
  return { count: set.size, preview };
}

function nowStamp() {
  const d = new Date();
  const pad2 = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad2(d.getMonth()+1)}${pad2(d.getDate())}${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
}

async function runAudit(skus, lang, asJson, outPath, strictMode) {
  const results = [];
  for (const code of skus) {
    const input = String(code || '').trim();
    if (!input) continue;
    let res = null;
    let errMsg = null;
    try {
      res = await detectFilter(input, lang);
    } catch (err) {
      errMsg = err && err.message ? err.message : String(err);
    }
    const engineApps = res?.engine_applications ?? res?.applications ?? [];
    const equipApps = res?.equipment_applications ?? [];
    const en = countUniqueApps(engineApps);
    const eq = countUniqueApps(equipApps);
    const volLow = (en.count < 6) || (eq.count < 6);
    const rapid = auditRapidRules(res, !!strictMode);
    const row = {
      input,
      sku: res?.sku || null,
      duty: res?.duty || null,
      family: res?.family || null,
      engine_count: en.count,
      equipment_count: eq.count,
      VOL_LOW: volLow,
      error: errMsg || null,
      engine_preview: en.preview,
      equipment_preview: eq.preview,
      rapid_failures: rapid.failures,
      rapid_warnings: rapid.warnings,
    };
    results.push(row);
  }

  const summary = {
    total: results.length,
    vol_low: results.filter(r => r.VOL_LOW).length,
    rapid_failures: results.reduce((acc, r) => acc + (r.rapid_failures?.length || 0), 0),
    rapid_warnings: results.reduce((acc, r) => acc + (r.rapid_warnings?.length || 0), 0),
    ok: results.filter(r => !r.VOL_LOW && (r.rapid_failures?.length || 0) === 0).length,
    created_at: new Date().toISOString(),
    lang,
    strict: !!strictMode,
  };

  // Human-friendly output
  console.log('=== VOL_LOW Audit Summary ===');
  console.log(`Total SKUs: ${summary.total}`);
  console.log(`VOL_LOW (bloqueo): ${summary.vol_low}`);
  console.log(`OK: ${summary.ok}`);

  for (const r of results) {
    const status = r.VOL_LOW ? 'VOL_LOW' : 'OK';
    console.log(`\n[${status}] ${r.input} -> SKU=${r.sku || 'N/A'} duty=${r.duty || 'N/A'} family=${r.family || 'N/A'}`);
    console.log(`  engine_unique=${r.engine_count} equipment_unique=${r.equipment_count}`);
    if (r.error) console.log(`  error=${r.error}`);
    if (r.engine_preview.length) {
      console.log('  engine_preview:');
      for (const p of r.engine_preview) console.log(`    - ${p.name}${p.years ? ' (' + p.years + ')' : ''}`);
    }
    if (r.equipment_preview.length) {
      console.log('  equipment_preview:');
      for (const p of r.equipment_preview) console.log(`    - ${p.name}${p.years ? ' (' + p.years + ')' : ''}`);
    }
    if ((r.rapid_failures?.length || 0) > 0) {
      console.log('  rapid_failures:');
      for (const f of r.rapid_failures) console.log(`    - ${f}`);
    }
    if ((r.rapid_warnings?.length || 0) > 0) {
      console.log('  rapid_warnings:');
      for (const w of r.rapid_warnings) console.log(`    - ${w}`);
    }
  }

  if (asJson) {
    const payload = { summary, results };
    console.log('\n=== JSON ===');
    console.log(JSON.stringify(payload, null, 2));
  }

  if (outPath) {
    const isJsonFile = /\.json$/i.test(outPath);
    const ts = nowStamp();
    const fileOut = isJsonFile ? outPath : path.join(outPath, `vol_low_audit_${ts}.json`);
    const dir = path.dirname(fileOut);
    try {
      fs.mkdirSync(dir, { recursive: true });
      const payload = { summary, results };
      fs.writeFileSync(fileOut, JSON.stringify(payload, null, 2), 'utf8');
      console.log(`\n✔ Informe guardado en: ${fileOut}`);
    } catch (e) {
      console.error(`\n✖ No se pudo escribir el informe: ${e.message}`);
    }
  }

  // Exit non-zero if any VOL_LOW found to help CI gating
  const exitCode = (summary.vol_low > 0 || summary.rapid_failures > 0) ? 1 : 0;
  process.exit(exitCode);
}

(async () => {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    process.exit(0);
  }
  if (args.strict && !args.noStrictNote) {
    console.log('ℹ️  Modo estricto activado: advertencias se consideran fallos.');
  }
  let skus = [...args.skus];
  if (args.file) {
    const filePath = path.resolve(process.cwd(), args.file);
    if (!fs.existsSync(filePath)) {
      console.error(`Archivo no encontrado: ${filePath}`);
      process.exit(2);
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    skus.push(...lines);
  }
  if (skus.length === 0) {
    printHelp();
    console.error('Debe proporcionar SKUs por argumentos o archivo.');
    process.exit(2);
  }
  await runAudit(skus, args.lang, args.json, args.out, args.strict);
})();

// ------------------------------
// Rapid Audit (Columns A–H)
// ------------------------------
function auditRapidRules(res, strict = false) {
  const failures = [];
  const warnings = [];

  const srcUp = String(res?.source || '').toUpperCase();
  const attrs = res?.attributes || {};

  // A: query_normalized
  const qn = res?.query_normalized;
  if (!qn) {
    failures.push('A.query_normalized: ausente');
  } else {
    const entries = toArray(qn);
    if (entries.length === 0) {
      warnings.push('A.query_normalized: valor simple, no listado');
    } else if (entries.length < 3) {
      warnings.push(`A.query_normalized: menos de 3 entradas (${entries.length})`);
    }
  }

  // B: normsku
  const sku = String(res?.sku || '').trim();
  if (!sku) {
    failures.push('B.normsku: ausente');
  } else {
    if (srcUp.includes('PARKER') || srcUp.includes('RACOR')) {
      if (!/^ET9|^EM9\-S/.test(sku)) {
        failures.push('B.normsku: Parker requiere prefijo ET9 o EM9-S');
      }
    }
    if (sku.length < 6) warnings.push(`B.normsku: longitud corta (${sku.length})`);
    if (!/^[A-Z0-9\-]+$/.test(sku)) warnings.push('B.normsku: formato no alfanumérico/guión');
  }

  // C: duty_type
  const duty = String(res?.duty || '').toUpperCase();
  if (!['HD','LD'].includes(duty)) failures.push(`C.duty_type: inválido (${duty || 'vacío'})`);

  // D: type (diseño físico)
  const physicalType = String(attrs?.type || '').toUpperCase();
  const allowedPhysical = new Set(['SPIN-ON','SPIN ON','CARTRIDGE','CARTUCHO','PANEL','CANISTER','INLINE']);
  const typeResolved = String(res?.type || res?.filter_type || res?.family || '').toUpperCase();
  if (physicalType) {
    if (!allowedPhysical.has(physicalType)) failures.push(`D.type: diseño físico inválido (${physicalType})`);
  } else {
    // No diseño físico en atributos → advertencia si solo hay familia/tipo lógico
    if (typeResolved) warnings.push(`D.type: sin diseño físico; type/family='${typeResolved}'`);
    else warnings.push('D.type: ausente');
  }

  // E: subtype
  const subtype = String(attrs?.subtype || '').toUpperCase();
  const allowedSubtype = new Set(['RADIAL SEAL','SEPARADOR W/F','SEPARATOR W/F','BY-PASS','BYPASS','WATER SEPARATOR']);
  if (subtype) {
    if (!allowedSubtype.has(subtype)) failures.push(`E.subtype: inválido (${subtype})`);
  } else {
    warnings.push('E.subtype: ausente');
  }

  // F: description
  const desc = String(attrs?.description || res?.description || '').trim();
  if (!desc) failures.push('F.description: ausente');
  else if (desc.length <= 40) failures.push(`F.description: demasiado corta (${desc.length})`);

  // G: oem_codes
  const oemCodes = Array.isArray(res?.oem_codes) ? res.oem_codes : toArray(res?.oem_codes);
  if ((oemCodes?.length || 0) < 1) failures.push('G.oem_codes: vacío');

  // H: cross_reference
  const xref = Array.isArray(res?.cross_reference) ? res.cross_reference : toArray(res?.cross_reference);
  if ((xref?.length || 0) < 1) failures.push('H.cross_reference: vacío');

  if (strict) {
    // En modo estricto, todas las advertencias se vuelven fallos
    return { failures: failures.concat(warnings), warnings: [] };
  }
  return { failures, warnings };
}