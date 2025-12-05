// Generates a customer-facing paragraph for Master column F (description)
// Language-aware and family/subtype/duty adaptive. No external scrapers.

function normalizeText(s) {
  return String(s || '').trim();
}

function pickSubtypePhrase(subtype, family) {
  const up = String(subtype || '').toUpperCase();
  const fam = String(family || '').toUpperCase();
  if (/RADIAL/.test(up)) return fam === 'AIR' ? 'con sello radial' : 'de sello radial';
  if (/AXIAL/.test(up)) return fam === 'AIR' ? 'con sello axial' : 'de sello axial';
  if (/SPIN[- ]?ON|ROSCAD/.test(up)) return 'tipo spin-on (roscado)';
  if (/CARTU?CHO|ELEMENT/.test(up)) return 'tipo cartucho';
  if (/PANEL/.test(up)) return 'tipo panel';
  if (/CONI|CYLIN/.test(up)) return 'tipo cónico/cilíndrico';
  if (/SEPARADOR|W\/F|WATER\s*SEPARATION/i.test(up)) return 'separador de agua/combustible';
  if (/BYPASS|BY[- ]?PASS/i.test(up)) return 'con válvula bypass';
  if (/FULL[- ]?FLOW|FLUJO\s*TOTAL/i.test(up)) return 'de flujo total';
  return '';
}

function pickMediaPhrase(media, lang = 'es') {
  const m = String(media || '').toUpperCase();
  const isEs = String(lang || 'es').toLowerCase().startsWith('es');
  if (/MACROCORE/.test(m)) {
    return isEs
      ? 'con tecnología MACROCORE™ diseñada con algoritmos inteligentes'
      : 'with MACROCORE™ technology engineered with intelligent algorithms';
  }
  // Mantener frases estándar para otros medios
  if (/CELLULOSE|CELULOSA/.test(m)) return isEs ? 'con medio de celulosa de eficiencia estándar' : 'with cellulose media for standard efficiency';
  if (/SYNTH|SINT[ÉE]TICO/.test(m)) return isEs ? 'con medio sintético para mayor eficiencia' : 'with synthetic media for higher efficiency';
  if (/MICROGLASS|FIBRA/i.test(m)) return isEs ? 'con microfibra para alta retención de partículas' : 'with microglass for high particle retention';
  return m ? (isEs ? `con medio ${media}` : `with ${media} media`) : '';
}

function genAirES({ duty, subtype, media_type }) {
  const dutyStr = String(duty || '').toUpperCase() === 'HD' ? 'de servicio pesado' : 'de servicio ligero';
  const sub = pickSubtypePhrase(subtype, 'AIR');
  const media = pickMediaPhrase(media_type, 'es');
  const parts = [
    `Filtro de aire primario ${dutyStr}${sub ? ', ' + sub : ''}`,
    'diseñado por ELIMFILTERS para mantener un flujo de aire estable y proteger el sistema de admisión',
    'al capturar contaminantes antes de que alcancen la cámara de combustión',
    media ? media : ''
  ].filter(Boolean);
  return parts.join('. ') + '.';
}

function genFuelES({ duty, subtype, media_type }) {
  const dutyStr = String(duty || '').toUpperCase() === 'HD' ? 'de servicio pesado' : 'de servicio ligero';
  const sub = pickSubtypePhrase(subtype, 'FUEL');
  const media = pickMediaPhrase(media_type, 'es');
  const parts = [
    `Filtro de combustible ${dutyStr}${sub ? ', ' + sub : ''}`,
    'ayuda a remover partículas y agua para proteger el sistema de inyección',
    media ? media : ''
  ].filter(Boolean);
  return parts.join('. ') + '.';
}

function genOilES({ duty, subtype, media_type }) {
  const dutyStr = String(duty || '').toUpperCase() === 'HD' ? 'de servicio pesado' : 'de servicio ligero';
  const sub = pickSubtypePhrase(subtype, 'OIL');
  const media = pickMediaPhrase(media_type, 'es');
  const parts = [
    `Filtro de aceite ${dutyStr}${sub ? ', ' + sub : ''}`,
    'retiene impurezas para extender la vida útil del motor y mantener la viscosidad del aceite dentro de rango',
    media ? media : ''
  ].filter(Boolean);
  return parts.join('. ') + '.';
}

function genHydraulicES({ duty, subtype, media_type }) {
  const sub = pickSubtypePhrase(subtype, 'HYDRAULIC');
  const media = pickMediaPhrase(media_type, 'es');
  const base = `Filtro hidráulico${sub ? ' ' + sub : ''}`;
  const bySubtype = (() => {
    const s = String(subtype || '').toLowerCase();
    if (s.includes('pres')) return 'Elemento para filtración crítica de línea de presión';
    if (s.includes('retor')) return 'Elemento de retorno: controla contaminación al volver al depósito';
    if (s.includes('suc')) return 'Elemento de succión/in-tank: protege la bomba ante partículas gruesas';
    if (s.includes('cartu')) return 'Elemento tipo cartucho para portafiltros hidráulicos';
    return 'Controla contaminación sólida para proteger válvulas y bombas en presión, retorno o succión';
  })();
  const parts = [
    base,
    bySubtype,
    media ? media : ''
  ].filter(Boolean);
  return parts.join('. ') + '.';
}

function genCoolantES({ media_type }) {
  const media = pickMediaPhrase(media_type, 'es');
  const parts = [
    'Filtro de refrigerante mantiene el equilibrio químico del sistema',
    'ayudando a reducir corrosión y cavitación en el bloque',
    media ? media : ''
  ].filter(Boolean);
  return parts.join('. ') + '.';
}

function genCabinES({ media_type }) {
  const media = pickMediaPhrase(media_type, 'es');
  const parts = [
    'Filtro de cabina mejora la calidad del aire interior',
    'capturando polvo, polen y partículas finas para mayor confort del usuario',
    media ? media : ''
  ].filter(Boolean);
  return parts.join('. ') + '.';
}

function genAirEN({ duty, subtype, media_type }) {
  const dutyStr = String(duty || '').toUpperCase() === 'HD' ? 'heavy‑duty' : 'light‑duty';
  const sub = pickSubtypePhrase(subtype, 'AIR');
  const media = pickMediaPhrase(media_type, 'en');
  const parts = [
    `Primary air filter (${dutyStr})${sub ? ', ' + sub : ''}`,
    'engineered by ELIMFILTERS to stabilize airflow and protect the intake system',
    'by capturing contaminants before they reach the combustion chamber',
    media ? media : ''
  ].filter(Boolean);
  return parts.join('. ') + '.';
}

function genFuelEN({ duty, subtype, media_type }) {
  const dutyStr = String(duty || '').toUpperCase() === 'HD' ? 'heavy‑duty' : 'light‑duty';
  const sub = pickSubtypePhrase(subtype, 'FUEL');
  const media = pickMediaPhrase(media_type, 'en');
  const parts = [
    `Fuel filter (${dutyStr})${sub ? ', ' + sub : ''}`,
    'helps remove particles and water to protect the injection system',
    media ? media : ''
  ].filter(Boolean);
  return parts.join('. ') + '.';
}

function genOilEN({ duty, subtype, media_type }) {
  const dutyStr = String(duty || '').toUpperCase() === 'HD' ? 'heavy‑duty' : 'light‑duty';
  const sub = pickSubtypePhrase(subtype, 'OIL');
  const media = pickMediaPhrase(media_type, 'en');
  const parts = [
    `Oil filter (${dutyStr})${sub ? ', ' + sub : ''}`,
    'retains impurities to extend engine life and keep oil viscosity within range',
    media ? media : ''
  ].filter(Boolean);
  return parts.join('. ') + '.';
}

function genHydraulicEN({ duty, subtype, media_type }) {
  const sub = pickSubtypePhrase(subtype, 'HYDRAULIC');
  const media = pickMediaPhrase(media_type, 'en');
  const base = `Hydraulic filter${sub ? ' ' + sub : ''}`;
  const bySubtype = (() => {
    const s = String(subtype || '').toLowerCase();
    if (s.includes('pres') || s.includes('press')) return 'Critical filtration element for pressure line service';
    if (s.includes('retor') || s.includes('return')) return 'Return element: controls contamination back to reservoir';
    if (s.includes('suc') || s.includes('suct') || s.includes('suction')) return 'Suction/in-tank element: protects pump against coarse particles';
    if (s.includes('cartu') || s.includes('cart') || s.includes('cartridge')) return 'Cartridge-style element for hydraulic housings';
    return 'Controls solid contamination to protect valves and pumps in pressure, return or suction circuits';
  })();
  const parts = [
    base,
    bySubtype,
    media ? media : ''
  ].filter(Boolean);
  return parts.join('. ') + '.';
}

function genCoolantEN({ media_type }) {
  const media = pickMediaPhrase(media_type, 'en');
  const parts = [
    'Coolant filter helps maintain the chemical balance of the system',
    'reducing corrosion and cavitation in the block',
    media ? media : ''
  ].filter(Boolean);
  return parts.join('. ') + '.';
}

function genCabinEN({ media_type }) {
  const media = pickMediaPhrase(media_type);
  const parts = [
    'Cabin filter improves indoor air quality',
    'capturing dust, pollen and fine particles for user comfort',
    media ? media : ''
  ].filter(Boolean);
  return parts.join('. ') + '.';
}

function generateDescription({ family, duty, subtype, media_type, lang = 'es' }) {
  const fam = String(family || '').toUpperCase();
  const isEs = String(lang || 'es').toLowerCase().startsWith('es');

  if (fam === 'AIR') return isEs ? genAirES({ duty, subtype, media_type }) : genAirEN({ duty, subtype, media_type });
  if (fam === 'FUEL') return isEs ? genFuelES({ duty, subtype, media_type }) : genFuelEN({ duty, subtype, media_type });
  if (fam === 'OIL') return isEs ? genOilES({ duty, subtype, media_type }) : genOilEN({ duty, subtype, media_type });
  if (fam === 'HYDRAULIC') return isEs ? genHydraulicES({ duty, subtype, media_type }) : genHydraulicEN({ duty, subtype, media_type });
  if (fam === 'COOLANT') return isEs ? genCoolantES({ media_type }) : genCoolantEN({ media_type });
  if (fam === 'CABIN') return isEs ? genCabinES({ media_type }) : genCabinEN({ media_type });

  // Fallback generic description
  return isEs
    ? 'Elemento filtrante diseñado por ELIMFILTERS para capturar contaminantes y proteger el sistema.'
    : 'Filter element engineered by ELIMFILTERS to capture contaminants and protect the system.';
}

module.exports = { generateDescription };
