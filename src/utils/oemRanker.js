// ============================================================================
// OEM RANKER - Selección de 8 códigos OEM más relevantes para hoja Master
// Mantiene una lista completa para MongoDB (sin límite) y aplica heurísticas
// de marca/patrón para priorizar códigos comerciales (Ford, CAT, IHC, Mack, etc.).
// ============================================================================

function normalize(code) {
  return String(code || '').trim().toUpperCase().replace(/\s+/g, '');
}

// Detecta marca OEM por patrón del código (heurístico)
function detectOemBrand(code) {
  const c = normalize(code);
  if (/^F[0-9][A-Z]{2}[0-9]{4}[A-Z]{0,2}$/.test(c)) return 'FORD'; // ej. F6HZ9601B, F1HZ9600BB
  if (/^(FA|FL)[0-9]{3,5}$/.test(c)) return 'MOTORCRAFT'; // FA1077, FL1A
  if (/^[0-9]{6,}C1$/.test(c)) return 'INTERNATIONAL'; // 3560734C1, 3520400C1
  if (/^[0-9]R[- ]?[0-9]{3,5}$/.test(c)) return 'CATERPILLAR'; // 1R-0750
  if (/^[0-9]{4,}[A-Z]{2}[0-9]{4,}$/.test(c)) return 'MACK'; // 3076CA7140 (aprox.)
  if (/^[A-Z]{3}[0-9]{4,}$/.test(c)) return 'TEC-FIL'; // ARS1849
  if (/^[0-9]{6,}$/.test(c)) return 'WHITE'; // 1117576
  return 'UNKNOWN';
}

// Pesa relevancia comercial por marca
function brandWeight(brand) {
  switch (brand) {
    case 'FORD': return 10;
    case 'MOTORCRAFT': return 9;
    case 'CATERPILLAR': return 9;
    case 'INTERNATIONAL': return 8;
    case 'MACK': return 8;
    case 'TEC-FIL': return 7;
    case 'WHITE': return 6;
    default: return 5; // desconocidos mantienen peso básico
  }
}

// Penaliza patrones típicos de aftermarket (no OEM)
const AFTERMARKET_RX = [
  /^(P)[0-9]{4,}$/i,               // Donaldson P series
  /^(LF|FF|AF|HF|WF)[0-9]+$/i,    // Fleetguard series
  /^(BF|PF|RS|HP|CA|PA)[0-9]+$/i, // Baldwin
  /^FL[-]?[0-9]+$/i,              // Motorcraft FL- aftermarket
  /^(PH|TG|XG|HM|CA|CF|PS|G)[0-9]+$/i, // FRAM
  /^(WL|WP|WA|WF)[0-9]+$/i,       // WIX
  /^(C|W|HU|PU|WK)[0-9]{3,}$/i    // MANN/MAHLE
];

function isAftermarketPattern(code) {
  const c = normalize(code);
  return AFTERMARKET_RX.some(rx => rx.test(c));
}

// Score final por relevancia + forma OEM + penalizaciones
function scoreCode(code) {
  const c = normalize(code);
  const brand = detectOemBrand(c);
  let score = brandWeight(brand);
  // bonus si tiene guión y mezcla letras/números (patrón OEM típico)
  if (/[-]/.test(c)) score += 1;
  if (/[A-Z]/.test(c) && /[0-9]/.test(c)) score += 1;
  // penalización por aftermarket
  if (isAftermarketPattern(c)) score -= 4;
  // preferir longitudes entre 6 y 12
  const len = c.length;
  if (len >= 6 && len <= 12) score += 1;
  return score;
}

function dedup(list) {
  const seen = new Set();
  const out = [];
  for (const item of (Array.isArray(list) ? list : [])) {
    const n = normalize(item);
    if (!n) continue;
    if (!seen.has(n)) { seen.add(n); out.push(n); }
  }
  return out;
}

function rankAndLimit(oems, limit = 8) {
  const list = dedup(oems);
  const scored = list.map(code => ({ code, score: scoreCode(code) }));
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.code.localeCompare(b.code);
  });
  return scored.slice(0, limit).map(s => s.code);
}

module.exports = {
  detectOemBrand,
  scoreCode,
  rankAndLimit,
  dedup
};