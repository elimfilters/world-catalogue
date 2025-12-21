// src/resolvers/familyResolver.js
// Define la FAMILIA exclusivamente por evidencia técnica oficial.
// Se ejecuta DESPUÉS de confirmar autoridad y DUTY.

module.exports = function familyResolver(facts = {}) {
  const text = [
    ...(facts.categories || []),
    ...(facts.product_types || []),
    facts.category_label || "",
    facts.domain || ""
  ].join(" ").toLowerCase();

  // Filtros de aceite
  if (/oil|lube|lubrication/.test(text)) {
    return "OIL";
  }

  // Filtros de aire (elemento)
  if (/air filter|air cleaner element/.test(text)) {
    return "AIR";
  }

  // Carcasas de aire (conjunto completo)
  if (/air filter housing|air cleaner assembly/.test(text)) {
    return "AIR_HOUSING";
  }

  // Combustible
  if (/fuel filter/.test(text)) {
    return "FUEL";
  }

  // Separador combustible / agua (convencional)
  if (/fuel\/water|water separator/.test(text)) {
    return "FUEL_WATER";
  }

  // Hidráulico
  if (/hydraulic/.test(text)) {
    return "HYDRAULIC";
  }

  // Refrigerante
  if (/coolant/.test(text)) {
    return "COOLANT";
  }

  // Kits (solo si viene explícito como kit)
  if (/service kit|maintenance kit|filter kit/.test(text)) {
    return "KITS";
  }

  return null; // Sin evidencia → no hay familia → no hay SKU
};
