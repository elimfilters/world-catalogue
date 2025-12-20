// ═══════════════════════════════════════════════════════════════════════════
// ELIMFILTERS - PREFIX MAP
// Mapeo de prefijos oficiales a Brand, Family y Duty
// ═══════════════════════════════════════════════════════════════════════════

export const PREFIXES = {
  // ─────────────────────────────────────────────────────────────────────────
  // FLEETGUARD (Heavy Duty)
  // ─────────────────────────────────────────────────────────────────────────
  'LF': { brand: 'Fleetguard', family: 'Lube Filter', duty: 'Heavy Duty' },
  'FF': { brand: 'Fleetguard', family: 'Fuel Filter', duty: 'Heavy Duty' },
  'AF': { brand: 'Fleetguard', family: 'Air Filter', duty: 'Heavy Duty' },
  'HF': { brand: 'Fleetguard', family: 'Hydraulic Filter', duty: 'Heavy Duty' },
  'WF': { brand: 'Fleetguard', family: 'Water Filter', duty: 'Heavy Duty' },
  'FS': { brand: 'Fleetguard', family: 'Fuel/Water Separator', duty: 'Heavy Duty' },
  'CS': { brand: 'Fleetguard', family: 'Coolant Filter', duty: 'Heavy Duty' },
  'CV': { brand: 'Fleetguard', family: 'Crankcase Ventilation', duty: 'Heavy Duty' },

  // ─────────────────────────────────────────────────────────────────────────
  // DONALDSON (Heavy Duty)
  // ─────────────────────────────────────────────────────────────────────────
  'P': { brand: 'Donaldson', family: 'Primary Filter', duty: 'Heavy Duty' },
  'B': { brand: 'Donaldson', family: 'Secondary Filter', duty: 'Heavy Duty' },
  'DBL': { brand: 'Donaldson', family: 'Lube Filter', duty: 'Heavy Duty' },
  'DBF': { brand: 'Donaldson', family: 'Fuel Filter', duty: 'Heavy Duty' },
  'DBA': { brand: 'Donaldson', family: 'Air Filter', duty: 'Heavy Duty' },

  // ─────────────────────────────────────────────────────────────────────────
  // BALDWIN (Heavy Duty)
  // ─────────────────────────────────────────────────────────────────────────
  'BT': { brand: 'Baldwin', family: 'Lube Filter', duty: 'Heavy Duty' },
  'BF': { brand: 'Baldwin', family: 'Fuel Filter', duty: 'Heavy Duty' },
  'PA': { brand: 'Baldwin', family: 'Air Filter', duty: 'Heavy Duty' },
  'PT': { brand: 'Baldwin', family: 'Hydraulic Filter', duty: 'Heavy Duty' },
  'RS': { brand: 'Baldwin', family: 'Air Filter', duty: 'Heavy Duty' },

  // ─────────────────────────────────────────────────────────────────────────
  // WIX (Heavy Duty)
  // ─────────────────────────────────────────────────────────────────────────
  'WL': { brand: 'WIX', family: 'Lube Filter', duty: 'Heavy Duty' },
  'WF': { brand: 'WIX', family: 'Fuel Filter', duty: 'Heavy Duty' },
  'WA': { brand: 'WIX', family: 'Air Filter', duty: 'Heavy Duty' },
  '51': { brand: 'WIX', family: 'Lube Filter', duty: 'Heavy Duty' },
  '33': { brand: 'WIX', family: 'Fuel Filter', duty: 'Heavy Duty' },
  '42': { brand: 'WIX', family: 'Air Filter', duty: 'Heavy Duty' },

  // ─────────────────────────────────────────────────────────────────────────
  // FRAM (Light Duty)
  // ─────────────────────────────────────────────────────────────────────────
  'PH': { brand: 'FRAM', family: 'Lube Filter', duty: 'Light Duty' },
  'CA': { brand: 'FRAM', family: 'Air Filter', duty: 'Light Duty' },
  'G': { brand: 'FRAM', family: 'Fuel Filter', duty: 'Light Duty' },
  'CH': { brand: 'FRAM', family: 'Cabin Air Filter', duty: 'Light Duty' },

  // ─────────────────────────────────────────────────────────────────────────
  // MANN (Light Duty)
  // ─────────────────────────────────────────────────────────────────────────
  'W': { brand: 'MANN', family: 'Lube Filter', duty: 'Light Duty' },
  'C': { brand: 'MANN', family: 'Air Filter', duty: 'Light Duty' },
  'WK': { brand: 'MANN', family: 'Fuel Filter', duty: 'Light Duty' },
  'CU': { brand: 'MANN', family: 'Cabin Air Filter', duty: 'Light Duty' },

  // ─────────────────────────────────────────────────────────────────────────
  // PUROLATOR (Light Duty)
  // ─────────────────────────────────────────────────────────────────────────
  'L': { brand: 'Purolator', family: 'Lube Filter', duty: 'Light Duty' },
  'A': { brand: 'Purolator', family: 'Air Filter', duty: 'Light Duty' },
  'F': { brand: 'Purolator', family: 'Fuel Filter', duty: 'Light Duty' },

  // ─────────────────────────────────────────────────────────────────────────
  // BOSCH (Light Duty)
  // ─────────────────────────────────────────────────────────────────────────
  'BO': { brand: 'Bosch', family: 'Lube Filter', duty: 'Light Duty' },
  'S': { brand: 'Bosch', family: 'Air Filter', duty: 'Light Duty' },
  'N': { brand: 'Bosch', family: 'Fuel Filter', duty: 'Light Duty' },

  // ─────────────────────────────────────────────────────────────────────────
  // MAHLE (Light Duty)
  // ─────────────────────────────────────────────────────────────────────────
  'OC': { brand: 'MAHLE', family: 'Lube Filter', duty: 'Light Duty' },
  'LX': { brand: 'MAHLE', family: 'Air Filter', duty: 'Light Duty' },
  'KL': { brand: 'MAHLE', family: 'Fuel Filter', duty: 'Light Duty' },
  'LA': { brand: 'MAHLE', family: 'Cabin Air Filter', duty: 'Light Duty' },

  // ─────────────────────────────────────────────────────────────────────────
  // SAKURA (Heavy Duty)
  // ─────────────────────────────────────────────────────────────────────────
  'C': { brand: 'Sakura', family: 'Lube Filter', duty: 'Heavy Duty' },
  'FC': { brand: 'Sakura', family: 'Fuel Filter', duty: 'Heavy Duty' },
  'A': { brand: 'Sakura', family: 'Air Filter', duty: 'Heavy Duty' },

  // ─────────────────────────────────────────────────────────────────────────
  // HENGST (Light Duty)
  // ─────────────────────────────────────────────────────────────────────────
  'H': { brand: 'Hengst', family: 'Lube Filter', duty: 'Light Duty' },
  'E': { brand: 'Hengst', family: 'Air Filter', duty: 'Light Duty' },
};

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIÓN: resolveBrandFamilyDutyByPrefix
// Resuelve Brand, Family y Duty a partir de un prefijo
// Normaliza DUTY según ELIMFILTERS: HD (Heavy Duty) o LD (Light Duty)
// ═══════════════════════════════════════════════════════════════════════════

export function resolveBrandFamilyDutyByPrefix(prefix) {
  if (!prefix) return null;

  // Buscar el prefijo en el mapa
  const entry = PREFIXES[prefix.toUpperCase()];
  
  if (!entry) return null;

  let duty = entry.duty;

  // ─────────────────────────────────────────────────────────────────────────
  // NORMALIZACIÓN DE DUTY SEGÚN ELIMFILTERS
  // ─────────────────────────────────────────────────────────────────────────
  // HD = Heavy Duty + Severe Duty
  // LD = Standard Duty + Light Duty
  // ─────────────────────────────────────────────────────────────────────────

  if (duty === 'Heavy Duty' || duty === 'Severe Duty') {
    duty = 'HD';
  } else if (duty === 'Standard Duty' || duty === 'Light Duty') {
    duty = 'LD';
  }

  return {
    brand: entry.brand,
    family: entry.family,
    duty: duty
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIÓN: extractPrefix
// Extrae el prefijo de un part number
// ═══════════════════════════════════════════════════════════════════════════

export function extractPrefix(partNumber) {
  if (!partNumber) return null;

  const cleaned = partNumber.toUpperCase().replace(/[^A-Z0-9]/g, '');

  // Intentar extraer prefijos de 2-3 caracteres
  for (let len = 3; len >= 2; len--) {
    const prefix = cleaned.substring(0, len);
    if (PREFIXES[prefix]) {
      return prefix;
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTACIÓN POR DEFECTO
// ═══════════════════════════════════════════════════════════════════════════

export default {
  PREFIXES,
  resolveBrandFamilyDutyByPrefix,
  extractPrefix
};
