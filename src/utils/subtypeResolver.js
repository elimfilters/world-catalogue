'use strict';

// Canonical resolver for Column F (subtype)
// Resolves to ONE normalized value per the policy table, using priority rules.

function stripAccents(x) {
  return String(x || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function norm(x) {
  return stripAccents(x)
    .replace(/[-_]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .toLowerCase();
}

function gatherText({ query, existingSubtype, description, media_type, cross_reference, attributes }) {
  const parts = [];
  parts.push(query || '');
  parts.push(existingSubtype || '');
  parts.push(description || '');
  parts.push(media_type || '');
  parts.push(cross_reference || '');
  if (attributes) {
    parts.push(attributes.subtype || '');
    parts.push(attributes.style || '');
    parts.push(attributes.funcion || attributes['función'] || attributes.function || '');
    parts.push(attributes.tipo_construccion || attributes['tipo de construcción'] || '');
    parts.push(attributes.diseno_interno || attributes['diseño interno'] || '');
    parts.push(attributes.thread_size || attributes.thread || attributes.rosca || '');
  }
  return norm(parts.join(' | '));
}

function hasAny(text, keywords) {
  const t = String(text || '');
  return keywords.some(k => t.includes(norm(k)));
}

function resolveAirSubtype(text, duty) {
  // Priority 1: Seal mechanism
  if (hasAny(text, ['radial seal', 'sello radial', 'rs'])) return 'Radial Seal';
  if (hasAny(text, ['axial seal', 'sello axial'])) return 'Axial Seal';
  // Priority 3: General physical form
  if (hasAny(text, ['panel', 'panel filter']) && String(duty || '').toUpperCase() === 'LD') return 'Panel (Automotriz)';
  if (hasAny(text, ['panel', 'panel filter'])) return 'Panel (Automotriz)';
  if (hasAny(text, ['conical', 'cone', 'cónico', 'conico', 'cylindrical', 'cilindrico'])) return 'Cónico';
  return '';
}

function resolveFuelSubtype(text) {
  // Priority 1: Specialized function
  if (hasAny(text, ['water separator', 'separador', 'separacion de agua', 'separación de agua', 'separator'])) return 'Separador W/F';
  // Priority 3: General design
  if (hasAny(text, ['spin on', 'spin-on', 'enroscable', 'roscado'])) return 'Spin-on';
  if (hasAny(text, ['cartridge', 'cartucho', 'elemento'])) return 'Cartucho';
  return '';
}

function resolveOilSubtype(text) {
  // Priority 1: Route/function
  if (hasAny(text, ['bypass', 'by-pass', 'derivacion', 'derivación'])) return 'By-Pass';
  if (hasAny(text, ['full flow', 'full-flow', 'flujo total', 'principal'])) return 'Flujo Total';
  // Priority 3: General design
  if (hasAny(text, ['spin on', 'spin-on', 'enroscable', 'roscado'])) return 'Spin-on';
  if (hasAny(text, ['cartridge', 'cartucho', 'elemento'])) return 'Cartucho';
  return '';
}

function resolveCoolantSubtype(text) {
  if (hasAny(text, ['with additive', 'con quimica', 'con química', 'sca', 'dca'])) return 'W/A (With Additive)';
  if (hasAny(text, ['without additive', 'sin quimica', 'sin química', 'blank'])) return 'W/O A (Without Additive)';
  return '';
}

function resolveHydraulicSubtype(text) {
  // Priority 2: Location
  if (hasAny(text, ['suction', 'succion', 'succión', 'in-tank', 'sumergido'])) return 'Succión';
  if (hasAny(text, ['pressure', 'presion', 'presión', 'alta presion', 'alta presión'])) return 'Presión';
  if (hasAny(text, ['return', 'retorno'])) return 'Retorno';
  // Physical form
  if (hasAny(text, ['cartridge', 'cartucho', 'elemento'])) return 'Cartucho';
  return '';
}

function resolveCabinSubtype(text) {
  if (hasAny(text, ['hepa', 'pm 2.5', 'pm2.5', 'premium'])) return 'Premium/HEPA';
  if (hasAny(text, ['activated carbon', 'carbon activado', 'carbón activado', 'charcoal'])) return 'Carbón Activado';
  return 'Estándar (Polen)';
}

function resolveSubtype(input) {
  const { family, duty, typeCanon, query, existingSubtype, description, media_type, cross_reference, attributes } = input || {};
  const text = gatherText({ query, existingSubtype, description, media_type, cross_reference, attributes });
  const fam = String(family || '').toUpperCase();
  const type = String(typeCanon || '').toLowerCase();

  let out = '';
  if (fam === 'AIR' || type.includes('aire')) out = resolveAirSubtype(text, duty);
  else if (fam === 'FUEL' || type.includes('fuel')) out = resolveFuelSubtype(text);
  else if (fam === 'OIL' || type.includes('oil') || type.includes('aceite')) out = resolveOilSubtype(text);
  else if (fam === 'COOLANT' || type.includes('coolant') || type.includes('refrigerante')) out = resolveCoolantSubtype(text);
  else if (fam === 'HYDRAULIC' || type.includes('hidra') || type.includes('hydraulic')) out = resolveHydraulicSubtype(text);
  else if (fam === 'CABIN' || type.includes('cabin') || type.includes('cabina')) out = resolveCabinSubtype(text);

  return out || '';
}

module.exports = { resolveSubtype };