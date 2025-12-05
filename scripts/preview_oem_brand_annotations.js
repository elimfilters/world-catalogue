'use strict';
try { require('dotenv').config(); } catch (_) {}

// Preview OEM codes with brand annotations (heurísticas suaves)
// Uso: node repo/scripts/preview_oem_brand_annotations.js "F1HT9600BB,F1HZ9601B,FA1077,3076CA7140,3520400C1,3540117C1,3560734C1,ARS1849"

function normalize(code) {
  return String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function annotateBrand(code) {
  const c = normalize(code);
  const out = { code: code, brand_guess: null, confidence: 'low', notes: '' };

  // Ford/Motorcraft patterns
  if (/^F1H[TAZ]/.test(c)) {
    out.brand_guess = 'FORD';
    out.confidence = 'high';
    out.notes = 'Prefijo F1H* típico Ford (plataforma F-1xx)';
    return out;
  }
  if (/^FA\d{3,5}$/.test(c)) {
    out.brand_guess = 'MOTORCRAFT (FORD)';
    out.confidence = 'high';
    out.notes = 'Formato FA-#### asociado a Motorcraft';
    return out;
  }

  // International/Navistar: 7+ dígitos + sufijo C1
  if (/^\d{6,}C1$/.test(c)) {
    out.brand_guess = 'INTERNATIONAL/NAVISTAR';
    out.confidence = 'medium';
    out.notes = 'Patrón numérico con sufijo C1 común en Navistar';
    return out;
  }

  // John Deere: AR + dígitos (variantes con sufijo letra)
  if (/^AR\d{3,}/.test(c) || /^ARS\d{2,}/.test(c)) {
    out.brand_guess = 'JOHN DEERE';
    out.confidence = 'medium';
    out.notes = 'Prefijo AR* frecuente en piezas John Deere';
    return out;
  }

  // Komatsu: 600- / 14X- (no presente aquí) → mantener low
  // Volvo/Mack: generalmente incluyen letras específicas y guiones → sin evidencia suficiente

  return out; // desconocido
}

function main() {
  const arg = process.argv[2] || '';
  if (!arg) {
    console.error('Uso: node repo/scripts/preview_oem_brand_annotations.js "OEM1,OEM2,..."');
    process.exit(1);
  }
  const list = arg.split(',').map(s => s.trim()).filter(Boolean);
  const annotations = list.map(annotateBrand);
  console.log('=== Anotación de marcas (previsualización) ===');
  console.log(JSON.stringify(annotations, null, 2));
}

main();