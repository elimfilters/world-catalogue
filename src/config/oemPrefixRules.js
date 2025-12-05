'use strict';

/**
 * Reglas simples de prefijo OEM para inferir familia y duty
 * Objetivo: permitir generación de SKU y completar Master
 * - RE##### (John Deere): FUEL, HD
 * - Solo dígitos (>=7): FUEL, HD
 * - Otros: devolver null para que el flujo estándar decida
 */
function resolveFamilyDutyByOEMPrefix(oemCode, dutyHint) {
  const code = String(oemCode || '').trim().toUpperCase();
  if (!code) return null;

  // John Deere RE-codes
  const jd = /^RE\d{4,}$/i.test(code);
  if (jd) {
    return { brand: 'JOHN DEERE', family: 'FUEL', duty: 'HD' };
  }

  // Solo dígitos (ej. 2089066, 3827643)
  const numeric = /^\d{6,}$/i.test(code);
  if (numeric) {
    return { brand: 'OEM', family: 'FUEL', duty: 'HD' };
  }

  // Mantener hint de duty si existe, sin asegurar familia
  if (dutyHint) {
    return { brand: 'OEM', family: null, duty: dutyHint };
  }

  return null;
}

module.exports = { resolveFamilyDutyByOEMPrefix };